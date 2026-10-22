import { describe, expect, it } from "vitest";
import mapJson from "../../../data/maps/graybox.json";
import { parseMap } from "./data/map.ts";
import { createWorld } from "./world.ts";
import { stepWorld } from "./stepWorld.ts";
import { gangIds } from "./data/gangDefs.ts";
import type { ModeKind } from "./modes/mode.ts";
import type { World } from "./world.ts";
import { versusMaps } from "./data/maps.ts";

const MAX_TICKS = 30 * 60 * 6; // six simulated minutes

let queenEvents = 0;

function playOut(seed: number, kind: ModeKind, timeLimit?: number): World {
  queenEvents = 0;
  const slots = [...gangIds.slice(0, 4), ...gangIds.slice(0, 4)].map((gang, i) => ({ team: i, gang, bot: "hard" as const }));
  const w = createWorld(parseMap(mapJson), slots, { seed, mode: { kind, ...(timeLimit ? { timeLimit } : {}) } });
  while (!w.mode.over && w.tick < MAX_TICKS) {
    queenEvents += stepWorld(w).filter((e) => e.type === "queen" && e.what !== "returned").length;
    for (const t of w.tanks) if (!Number.isFinite(t.pos.x + t.pos.y + t.rot + t.hp)) throw new Error(`NaN on tank ${t.id} at tick ${w.tick}`);
  }
  return w;
}

describe("soak: bots vs bots", () => {
  for (const kind of ["deathmatch", "annihilation", "family", "tankWars"] as const) {
    for (const seed of [1, 2]) {
      it(`${kind} seed ${seed} finishes with a winner`, () => {
        const w = playOut(seed, kind);
        expect(w.mode.over).toBe(true);
        expect(w.tanks.reduce((n, t) => n + t.kills, 0)).toBeGreaterThan(0);
      });
    }
  }
  for (const kind of ["battlelord", "frenzy", "holdEm"] as const) {
    it(`${kind}: bots play the objective and the match ends`, () => {
      const w = playOut(5, kind, 300);
      expect(w.mode.over).toBe(true);
      expect(queenEvents).toBeGreaterThan(0);
    });
  }
  it("koth: bots fight over the zone and someone scores", () => {
    const w = playOut(4, "koth", 240);
    expect(w.mode.over).toBe(true);
    expect(Object.values(w.mode.scores).some((v) => v > 0)).toBe(true);
  });

  it("horde: hard bots on the home team survive some waves", () => {
    const slots = gangIds.slice(0, 3).map((gang, i) => ({ team: i, gang, bot: "hard" as const }));
    const w = createWorld(parseMap(mapJson), slots, { seed: 6, mode: { kind: "horde", scoreLimit: 4 } });
    while (!w.mode.over && w.tick < MAX_TICKS) stepWorld(w);
    expect(w.horde!.wave).toBeGreaterThan(1);
  });

  for (const json of versusMaps.slice(1)) {
    it(`${json.id}: a bots-only deathmatch plays out`, () => {
      const slots = gangIds.slice(0, 6).map((gang, i) => ({ team: i, gang, bot: "hard" as const }));
      const w = createWorld(parseMap(json), slots, { seed: 9, mode: { kind: "deathmatch", scoreLimit: 5 } });
      while (!w.mode.over && w.tick < MAX_TICKS) stepWorld(w);
      expect(w.mode.over).toBe(true);
    });
  }
}, 120_000);
