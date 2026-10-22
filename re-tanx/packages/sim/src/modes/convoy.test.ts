import { describe, expect, it } from "vitest";
import { createWorld } from "../world.ts";
import { parseMap } from "../data/map.ts";
import { mapById } from "../data/maps.ts";
import { run } from "../testing/makeWorld.ts";
import { applyDamage } from "../systems/applyDamage.ts";
import { dist } from "../math/vec2.ts";
import { isTruck } from "./convoy.ts";
import { modeDefs } from "../data/modeDefs.ts";
import type { World } from "../world.ts";

const make = (bots = false) => createWorld(parseMap(mapById("fortress")), [
  { team: 0, kind: "m1", ...(bots ? { bot: "normal" as const } : {}) }, { team: 1, kind: "m1", ...(bots ? { bot: "normal" as const } : {}) },
], { mode: { kind: "convoy" }, seed: 4 });
const trucks = (w: World) => w.tanks.filter(isTruck);

describe("convoy", () => {
  it("lines up three trucks at the protectors' fortress with a road to the other one", () => {
    const w = make();
    expect(trucks(w)).toHaveLength(modeDefs.convoy.trucks);
    expect(w.convoy!.path.length).toBeGreaterThan(5);
    expect(trucks(w).every((t) => t.team === 0)).toBe(true);
  });

  it("trucks only roll with a protector nearby", () => {
    const w = make();
    const [protector, attacker] = [w.tanks[0]!, w.tanks[1]!];
    protector.pos = { x: 5, y: 175 }; // far away
    attacker.pos = { x: 270, y: 5 };
    const start = { ...trucks(w)[0]!.pos };
    run(w, 60);
    expect(dist(trucks(w)[0]!.pos, start)).toBeLessThan(1);
    protector.pos = { ...trucks(w)[1]!.pos, y: trucks(w)[1]!.pos.y + 6 };
    run(w, 60, { [protector.id]: {} });
    expect(dist(trucks(w)[0]!.pos, start)).toBeGreaterThan(3);
  });

  it("delivered trucks score; two rounds with swapped sides; most deliveries wins", () => {
    const w = make();
    const [p0] = [w.tanks[0]!];
    const range = modeDefs.convoy.escortRange;
    modeDefs.convoy.escortRange = 1e4; // "always escorted": this test is about delivery and rounds
    try {
      for (let i = 0; i < 30 * 150 && w.convoy!.round === 1; i++) run(w, 1);
    } finally {
      modeDefs.convoy.escortRange = range;
    }
    expect(w.mode.scores[0]).toBeGreaterThan(0);
    expect(w.convoy!.round).toBe(2);
    expect(trucks(w).every((t) => t.team === 1)).toBe(true);
    // round 2: team 1's trucks all get destroyed
    for (const t of trucks(w)) applyDamage(w, { target: t, amount: 9999, sourceId: p0.id, from: p0.pos });
    run(w, 2);
    expect(w.mode).toMatchObject({ over: true, winner: 0 });
  });

  it("bots play it: protectors escort and something happens to the trucks within a round", () => {
    const w = make(true);
    const start = trucks(w).map((t) => ({ ...t.pos }));
    run(w, 30 * 40);
    const moved = trucks(w).some((t, i) => !t.alive || dist(t.pos, start[i]!) > 10);
    expect(moved).toBe(true);
  });
});
