import { describe, expect, it } from "vitest";
import act1 from "../../../../data/campaign/act1.json";
import type { MissionDef } from "./missionDefs.ts";
import { createMissionWorld } from "./createMission.ts";
import { phaseFor } from "./boss.ts";
import { stepWorld } from "../stepWorld.ts";
import { applyDamage } from "../systems/applyDamage.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { campaignDefs } from "./missionDefs.ts";

const finale = (act1.missions as unknown as MissionDef[]).find((m) => m.id === "a1m12")!;
const start = () => {
  const w = createMissionWorld({ mission: finale, players: ["goliath"], bucks: 100, difficulty: "normal", seed: 2 });
  stepWorld(w);
  return w;
};

describe("bosses", () => {
  it("phase thresholds at 66% and 33%", () => {
    expect([phaseFor(1), phaseFor(0.7), phaseFor(0.5), phaseFor(0.2)]).toEqual([0, 0, 1, 2]);
  });

  it("each new phase summons adds and announces itself", () => {
    const w = start();
    const boss = w.tanks.find((t) => t.kind === "warlord")!;
    const before = w.tanks.length;
    boss.hp = tankDefs.warlord.hp * 0.5;
    const events = [stepWorld(w), stepWorld(w)].flat();
    expect(events).toContainEqual(expect.objectContaining({ type: "bossPhase", phase: 1 }));
    expect(w.tanks.length).toBe(before + campaignDefs.boss.adds[1]!.length);
  });

  it("barrages are telegraphed a second before they land", () => {
    const w = start();
    w.bosses[0]!.barrageIn = 0;
    const warn = stepWorld(w).filter((e) => e.type === "strikeWarn");
    expect(warn.length).toBe(campaignDefs.boss.barrage[0]!.strikes);
    expect(w.strikes.length).toBe(warn.length);
    for (let i = 0; i < 32; i++) stepWorld(w);
    expect(w.strikes).toHaveLength(0);
  });

  it("rear vents take double damage", () => {
    const w = start();
    const boss = w.tanks.find((t) => t.kind === "warlord")!;
    boss.rot = 0;
    const hp = boss.hp;
    applyDamage(w, { target: boss, amount: 50, sourceId: 0, from: { x: boss.pos.x - 20, y: boss.pos.y } });
    expect(hp - boss.hp).toBe(Math.round(50 * 2 - tankDefs.warlord.armor));
  });

  it("bosses aren't deployable tanks", async () => {
    const { tankKinds } = await import("../data/tankDefs.ts");
    expect(tankKinds).not.toContain("warlord");
  });
});
