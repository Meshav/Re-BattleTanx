import { describe, expect, it } from "vitest";
import mapJson from "../../../../data/maps/graybox.json";
import { parseMap } from "../data/map.ts";
import { createWorld } from "../world.ts";
import { stepWorld } from "../stepWorld.ts";
import { gangIds } from "../data/gangDefs.ts";
import { applySnapshot, makeSnapshot, structureStages } from "./snapshot.ts";
import { campaignMissions } from "../data/missions.ts";
import { createMissionWorld } from "../campaign/createMission.ts";
import { createCampaignState } from "../campaign/state.ts";
import { deployTank } from "../campaign/deploy.ts";

const full = (w: Parameters<typeof structureStages>[0]) => ({ meId: w.tanks[0]!.id, full: true, stages: structureStages(w), pickups: true });
const delta = { meId: undefined, full: false, stages: undefined, pickups: false };
import { parseClientMsg, sanitizeInput } from "./validate.ts";

describe("validation", () => {
  it("clamps hostile input instead of trusting it", () => {
    expect(sanitizeInput({ throttle: 99, steer: "x", aim: NaN, fire: "yes", special: true, cycle: -7 }))
      .toEqual({ throttle: 1, steer: 0, strafe: 0, aim: 0, fire: false, special: true, cycle: -1 });
  });

  it("rejects junk and oversize messages, cleans names", () => {
    expect(parseClientMsg("not json")).toBeUndefined();
    expect(parseClientMsg(JSON.stringify({ t: "nope" }))).toBeUndefined();
    expect(parseClientMsg("x".repeat(5000))).toBeUndefined();
    expect(parseClientMsg(JSON.stringify({ t: "hello", name: "<b>Mesh</b>!!", gang: "bogus" }))).toEqual({ t: "hello", name: "bMeshb", gang: gangIds[0] });
    expect(parseClientMsg(JSON.stringify({ t: "create", settings: { bots: 99, mode: "x" } }))).toMatchObject({ settings: { bots: 7, mode: "deathmatch" } });
  });
});

describe("snapshots", () => {
  const map = parseMap(mapJson);
  const slots = gangIds.slice(0, 4).map((gang, i) => ({ team: i, gang, bot: "hard" as const }));

  it("a mirror world rebuilt from snapshots matches the server's tanks and structures", () => {
    const server = createWorld(map, slots, { seed: 7 });
    for (let i = 0; i < 300; i++) stepWorld(server);
    const mirror = createWorld(map, [], {});
    applySnapshot(mirror, JSON.parse(JSON.stringify(makeSnapshot(server, full(server)))));
    expect(mirror.tanks[0]!.name).toBe(server.tanks[0]!.name);
    expect(mirror.tanks[0]!.specials).toEqual(server.tanks[0]!.specials);
    expect(mirror.tanks.map((t) => [t.id, Math.round(t.pos.x)])).toEqual(server.tanks.map((t) => [t.id, Math.round(t.pos.x)]));
    expect(structureStages(mirror)).toBe(structureStages(server));
  });

  it("delta snapshots keep the meta from the last full one", () => {
    const server = createWorld(map, slots, { seed: 7 });
    const mirror = createWorld(map, [], {});
    applySnapshot(mirror, makeSnapshot(server, full(server)));
    stepWorld(server);
    applySnapshot(mirror, makeSnapshot(server, delta));
    expect(mirror.tanks.map((t) => t.name)).toEqual(server.tanks.map((t) => t.name));
  });

  it("stays within the bandwidth budget (doc 09: < 40 KB/s at 20 Hz)", () => {
    const w = createWorld(map, [...slots, ...slots], { seed: 3 });
    for (let i = 0; i < 300; i++) stepWorld(w);
    const bytes = JSON.stringify(makeSnapshot(w, delta)).length;
    expect(bytes * 20).toBeLessThan(40_000);
  });

  it("campaign co-op: objectives, wallet and pending redeploys reach the mirror", () => {
    const mission = campaignMissions[2]!;
    const w = createMissionWorld({ mission, players: ["m1", "moto"], bucks: 200, difficulty: "normal", seed: 3 });
    for (let i = 0; i < 30; i++) stepWorld(w);
    w.tanks[1]!.alive = false;
    expect(deployTank(w, w.tanks[1]!.id, "m1")).toBe(true);
    w.campaign!.objectives[0]!.done = true;
    const mirror = createWorld(parseMap(mission.map), [], { mode: { kind: "campaign" }, campaign: createCampaignState(mission, 0, "normal") });
    applySnapshot(mirror, JSON.parse(JSON.stringify(makeSnapshot(w, full(w)))));
    expect(mirror.campaign!.bucks).toBe(w.campaign!.bucks);
    expect(mirror.campaign!.pendingDeploy).toEqual({ [w.tanks[1]!.id]: "m1" });
    expect(mirror.campaign!.objectives[0]!.done).toBe(true);
    expect(mirror.campaign!.mission.id).toBe(mission.id);
  });
});
