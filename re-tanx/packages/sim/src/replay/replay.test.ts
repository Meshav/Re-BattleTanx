import { describe, expect, it } from "vitest";
import { createRecorder, isReplay, playReplay, quantizeInput } from "./replay.ts";
import { createWorld, type TankSlot } from "../world.ts";
import { parseMap } from "../data/map.ts";
import { mapById } from "../data/maps.ts";
import { stepWorld } from "../stepWorld.ts";
import { nextRandom } from "../math/rng.ts";
import { campaignMissions } from "../data/missions.ts";
import { createMissionWorld } from "../campaign/createMission.ts";
import { deployTank } from "../campaign/deploy.ts";
import { createBot } from "../ai/botState.ts";

describe("replays", () => {
  it("playback reproduces the live match exactly", () => {
    // the human brings weapon upgrades: levels climbing mid-match must replay identically too
    const slots: TankSlot[] = [{ team: 0, gang: "ironHounds", weaponXp: { guided: 30, swarm: 1e6, mine: 5 } }, { team: 1, gang: "ironHounds", bot: "hard" }, { team: 2, gang: "ironHounds", bot: "normal" }];
    const opts = { seed: 77, mode: { kind: "deathmatch" as const } };
    const live = createWorld(parseMap(mapById("graybox")), slots, opts);
    const rec = createRecorder({ map: "graybox", slots, opts }, 1);
    const noise = { state: 5 }; // a jittery "human"
    for (let t = 0; t < 30 * 40 && !live.mode.over; t++) {
      const r = () => nextRandom(noise) * 2 - 1;
      live.inputs[live.tanks[0]!.id] = quantizeInput({ throttle: t % 90 < 60 ? 1 : -0.4, steer: r() * 0.7, strafe: 0, aim: r() * Math.PI, fire: r() > 0, special: r() > 0.9, cycle: t % 200 === 0 ? 1 : 0 });
      rec.record(live);
      stepWorld(live);
    }
    const replay = JSON.parse(JSON.stringify(rec.finish(live)));
    expect(isReplay(replay)).toBe(true);
    const pb = playReplay(replay);
    while (!pb.done) pb.step();
    const snap = (w: typeof live) => w.tanks.map((t) => [t.pos.x, t.pos.y, t.hp, t.kills, t.deaths]);
    expect(snap(pb.world)).toEqual(snap(live));
    expect(pb.world.tick).toBe(live.tick);
  });

  it("campaign replays carry redeploys; online replays carry bot takeovers", () => {
    const mission = campaignMissions.find((m) => m.id === "a1m12")!;
    // with a full loadout and Oracles on the wingmen: all of it must replay exactly
    const setup = {
      id: mission.id, players: ["moto" as const], bucks: 5000, difficulty: "hard" as const, seed: 9, names: ["Ace"],
      loadouts: [{ perks: ["treads" as const], pros: ["treads" as const], weaponXp: { guided: 40 }, mastery: { moto: 100 }, oracle: { id: "vesper" as const, bond: 4 } }],
      allyOracles: [{ id: "ione" as const, bond: 2 }],
    };
    const live = createMissionWorld({ ...setup, mission });
    const rec = createRecorder({ map: "", slots: [], opts: {}, mission: setup }, 1);
    let deploys = 0;
    for (let t = 0; t < 30 * 90 && !live.mode.over; t++) {
      const me = live.tanks[0]!;
      if (!me.alive && deployTank(live, me.id, "moto")) { rec.action(live, 0, "moto"); deploys++; }
      live.inputs[me.id] = quantizeInput({ throttle: 1, steer: Math.sin(t / 40), strafe: 0, aim: me.rot, fire: true, special: false, cycle: 0 });
      rec.record(live);
      stepWorld(live);
    }
    expect(deploys).toBeGreaterThan(0);
    const pb = playReplay(JSON.parse(JSON.stringify(rec.finish(live))));
    while (!pb.done) pb.step();
    expect(pb.world.campaign!.bucks).toBe(live.campaign!.bucks);
    expect([pb.world.tanks[0]!.name, pb.world.tanks[0]!.oracle?.id, pb.world.tanks[1]!.oracle?.id]).toEqual(["Ace", "vesper", "ione"]);
    expect(pb.world.tanks.map((t) => [t.pos.x, t.hp, t.deaths])).toEqual(live.tanks.map((t) => [t.pos.x, t.hp, t.deaths]));

    // a versus player drops out at tick 100 and a bot takes over
    const slots: TankSlot[] = [{ team: 0, gang: "ironHounds" }, { team: 1, gang: "boneRiders", bot: "easy" }];
    const v = createWorld(parseMap(mapById("neon")), slots, { seed: 4 });
    const vr = createRecorder({ map: "neon", slots, opts: { seed: 4 } }, 1);
    for (let t = 0; t < 300; t++) {
      if (t === 100) { v.bots[v.tanks[0]!.id] = createBot("normal"); vr.action(v, 0, "bot"); }
      if (t === 200) { delete v.bots[v.tanks[0]!.id]; vr.action(v, 0, "human"); } // they rejoined
      if (t < 100 || t >= 200) v.inputs[v.tanks[0]!.id] = quantizeInput({ throttle: 0.5, steer: 0.2, strafe: 0, aim: 1, fire: t % 20 === 0, special: false, cycle: 0 });
      vr.record(v);
      stepWorld(v);
    }
    const vb = playReplay(JSON.parse(JSON.stringify(vr.finish(v))));
    while (!vb.done) vb.step();
    expect(vb.world.tanks.map((t) => [t.pos.x, t.pos.y])).toEqual(v.tanks.map((t) => [t.pos.x, t.pos.y]));
  });

  it("rejects junk", () => {
    expect(isReplay({ version: 1, map: "x", slots: [], ticks: 3, inputs: [[[1, 2]]] })).toBe(false);
    expect(isReplay(null)).toBe(false);
    expect(isReplay({ version: 1, map: "graybox", slots: [{ team: 0, kind: "deathstar" }], ticks: 3, inputs: [] })).toBe(false);
    expect(isReplay({ version: 1, map: "graybox", slots: [{ team: 0, weaponXp: { laser: 12 } }], ticks: 3, inputs: [] })).toBe(true);
    expect(isReplay({ version: 1, map: "graybox", slots: [{ team: 0, weaponXp: { deathray: 12 } }], ticks: 3, inputs: [] })).toBe(false);
    expect(isReplay({ version: 1, map: "graybox", slots: [{ team: 0, weaponXp: { laser: -1 } }], ticks: 3, inputs: [] })).toBe(false);
    expect(isReplay({ version: 1, map: "graybox", slots: [{ team: 0, oracle: { id: "vesper", bond: 9 } }], ticks: 3, inputs: [] })).toBe(false);
  });
});
