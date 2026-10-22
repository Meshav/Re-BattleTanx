import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { composeWave, waveBudget } from "./horde.ts";
import { applyDamage } from "../systems/applyDamage.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { modeDefs } from "../data/modeDefs.ts";

const field = ["S..........S", "............", "............", "S..........S"];

describe("king of the rubble", () => {
  it("a team alone in the zone scores; a contested zone scores nobody", () => {
    const w = makeWorld(field, [{ team: 0, kind: "m1" }, { team: 1, kind: "m1" }], { mode: { kind: "koth" } });
    const [a, b] = [w.tanks[0]!, w.tanks[1]!];
    a.pos = { ...w.zone!.pos };
    b.pos = { x: 5, y: 5 };
    run(w, 31);
    expect(w.mode.scores[0]).toBeCloseTo(1, 0);
    b.pos = { x: w.zone!.pos.x + 4, y: w.zone!.pos.y };
    const before = w.mode.scores[0];
    run(w, 30);
    expect(w.mode.scores[0]).toBeCloseTo(before!, 1);
    expect(w.zone!.holder).toBe(-2);
  });

  it("moves after its timer", () => {
    const w = makeWorld(field, [{ team: 0, kind: "m1" }], { mode: { kind: "koth" } });
    w.zone!.moveIn = 0.05;
    const events = run(w, 3);
    expect(events.some((e) => e.type === "zone")).toBe(true);
  });
});

describe("horde", () => {
  it("budget follows doc 06 and grows with wave and players", () => {
    expect(waveBudget(1, 1)).toBe(16);
    expect(waveBudget(5, 2)).toBeGreaterThan(waveBudget(5, 1));
  });

  it("boss waves bring the warlords", () => {
    const w = makeWorld(field, [], { mode: { kind: "horde" } });
    expect(composeWave(w, modeDefs.horde.bossEvery, 1).slice(0, 2)).toEqual(modeDefs.horde.boss);
  });

  it("puts every slot on the humans' team, sends waves, and ends when lives run out", () => {
    const w = makeWorld(field, [{ team: 3, kind: "goliath" }, { team: 5, kind: "m1", bot: "normal" }], { mode: { kind: "horde" } });
    expect(w.tanks.map((t) => t.team)).toEqual([0, 0]);
    run(w, 30 * 4);
    expect(w.horde!.wave).toBe(1);
    expect(w.tanks.some((t) => t.team === 1)).toBe(true);
    const me = w.tanks[0]!;
    w.horde!.lives = 0;
    applyDamage(w, { target: me, amount: 9999, sourceId: 0, from: me.pos });
    w.recentEvents = [];
    run(w, 1, {});
    // the kill went through applyDamage directly; feed it like a tick would
    w.horde!.lives = -1;
    run(w, 2);
    expect(w.mode).toMatchObject({ over: true, winner: 1 });
    expect(tankDefs.goliath).toBeDefined();
  });

  it("clearing the last wave wins", () => {
    const w = makeWorld(field, [{ team: 0, kind: "goliath" }], { mode: { kind: "horde", scoreLimit: 1 } });
    run(w, 30 * 4);
    for (const t of w.tanks) if (t.team === 1) applyDamage(w, { target: t, amount: 9999, sourceId: w.tanks[0]!.id, from: t.pos });
    run(w, 2);
    expect(w.mode).toMatchObject({ over: true, winner: 0 });
  });
});
