import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { applyDamage } from "../systems/applyDamage.ts";
import { siegeCore } from "./siege.ts";
import { createWorld } from "../world.ts";
import { parseMap } from "../data/map.ts";
import { mapById } from "../data/maps.ts";

const field = ["S..........S", "............", "............", "S..........S"];
const kill = (w: ReturnType<typeof makeWorld>, i: number) => applyDamage(w, { target: w.tanks[i]!, amount: 9999, sourceId: 0, from: w.tanks[i]!.pos });

describe("last gang standing", () => {
  it("scores the round to the last team alive, then brings everyone back", () => {
    const w = makeWorld(field, [{ team: 0, kind: "m1" }, { team: 1, kind: "m1" }, { team: 1, kind: "m1" }], { mode: { kind: "lastGang" } });
    kill(w, 0);
    const events = run(w, 1);
    expect(events).toContainEqual({ type: "round", round: 1, winner: 1 });
    expect(w.mode.scores[1]).toBe(1);
    run(w, 30 * 2);
    expect(w.tanks[0]!.alive).toBe(false); // no respawn mid-break
    run(w, 30 * 3);
    expect(w.tanks.every((t) => t.alive)).toBe(true);
    expect(w.mode.round).toBe(2);
  });

  it("first to the round limit wins", () => {
    const w = makeWorld(field, [{ team: 0, kind: "m1" }, { team: 1, kind: "m1" }], { mode: { kind: "lastGang", scoreLimit: 1 } });
    kill(w, 1);
    run(w, 1);
    expect(w.mode).toMatchObject({ over: true, winner: 0 });
  });
});

describe("siege", () => {
  const siegeWorld = () => createWorld(parseMap(mapById("fortress")), [
    { team: 0, kind: "m1" }, { team: 1, kind: "m1", bot: "normal" }, { team: 1, kind: "goliath", bot: "normal" }, { team: 0, kind: "m1" },
  ], { mode: { kind: "siege" }, seed: 3 });

  it("puts a core at the defenders' fortress and two teams on the field", () => {
    const w = siegeWorld();
    expect(siegeCore(w)?.hp).toBe(2500);
    expect(new Set(w.tanks.map((t) => t.team))).toEqual(new Set([0, 1]));
  });

  it("attackers win when the core falls; defenders win on time", () => {
    const w = siegeWorld();
    siegeCore(w)!.hp = 0;
    run(w, 1);
    expect(w.mode).toMatchObject({ over: true, winner: 1 });
    const t = siegeWorld();
    t.mode.elapsed = t.mode.timeLimit;
    run(t, 1);
    expect(t.mode).toMatchObject({ over: true, winner: 0 });
  });

  it("attacking bots go and shoot the core", () => {
    const w = siegeWorld();
    for (const t of w.tanks.filter((k) => k.team === 0)) t.pos = { x: 270, y: 170 }; // defenders idle in a far corner
    run(w, 30 * 60);
    expect(siegeCore(w)!.hp).toBeLessThan(2500);
  });
});
