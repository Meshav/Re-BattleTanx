import { describe, expect, it } from "vitest";
import { createWorld } from "../world.ts";
import { parseMap } from "../data/map.ts";
import { mapById } from "../data/maps.ts";
import { run } from "../testing/makeWorld.ts";
import { applyDamage } from "../systems/applyDamage.ts";
import { railOf } from "./rail.ts";
import { tankDefs } from "../data/tankDefs.ts";

const fortress = () => createWorld(parseMap(mapById("fortress")), [{ team: 0, kind: "m1" }, { team: 1, kind: "m1" }], { mode: { kind: "battlelord" }, seed: 2 });

describe("rail Goliath", () => {
  it("each fortress gets a track", () => {
    const w = fortress();
    expect(w.rails.map((r) => r.team)).toEqual([0, 1]);
    for (const r of w.rails) expect(Math.abs(r.b.x - r.a.x)).toBeGreaterThanOrEqual(20);
  });

  it("park on it to man it: slides only along the track, fires the heavy gun, takes less damage; hold a hard turn to hop off", () => {
    const w = fortress();
    const [me, foe] = [w.tanks[0]!, w.tanks[1]!];
    const rail = w.rails[0]!;
    me.pos = { x: (rail.a.x + rail.b.x) / 2, y: rail.a.y + 1 };
    run(w, 30, { [me.id]: {} });
    expect(railOf(w, me.id)).toBe(rail);
    run(w, 30, { [me.id]: { throttle: 1, aim: 0 } });
    expect(me.pos.y).toBeCloseTo(rail.a.y, 5);
    expect(me.pos.x).toBeGreaterThan((rail.a.x + rail.b.x) / 2);
    run(w, 100, { [me.id]: { throttle: 1 } });
    expect(me.pos.x).toBeCloseTo(rail.b.x, 5); // end stop
    const hp = me.hp;
    applyDamage(w, { target: me, amount: 50, sourceId: foe.id, from: foe.pos });
    const armored = hp - me.hp;
    expect(armored).toBeLessThan(50 - tankDefs.m1.armor);
    const events = run(w, 2, { [me.id]: { fire: true } });
    expect(events.some((e) => e.type === "fire" && e.tankId === me.id)).toBe(true);
    run(w, 20, { [me.id]: { steer: 1 } });
    expect(railOf(w, me.id)).toBeUndefined();
  });

  it("enemies can't use your rail, and the gun frees up when its rider dies", () => {
    const w = fortress();
    const [me, foe] = [w.tanks[0]!, w.tanks[1]!];
    const rail = w.rails[0]!;
    foe.pos = { x: (rail.a.x + rail.b.x) / 2, y: rail.a.y };
    run(w, 40);
    expect(rail.riderId).toBeUndefined();
    me.pos = { ...foe.pos };
    foe.pos = { x: 5, y: 5 };
    run(w, 40);
    expect(rail.riderId).toBe(me.id);
    applyDamage(w, { target: me, amount: 9999, sourceId: foe.id, from: foe.pos });
    run(w, 1);
    expect(rail.riderId).toBeUndefined();
  });

  it("defending bots man the gun", () => {
    const w = createWorld(parseMap(mapById("fortress")), Array.from({ length: 6 }, (_, i) => ({ team: i % 2, kind: "m1" as const, bot: "normal" as const })), { mode: { kind: "battlelord" }, seed: 5 });
    let manned = false;
    for (let i = 0; i < 30 * 40 && !manned; i++) {
      run(w, 1);
      manned = w.rails.some((r) => r.riderId !== undefined);
    }
    expect(manned).toBe(true);
  });
});
