import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { tankDefs } from "../data/tankDefs.ts";

describe("shells", () => {
  it("travel and hit an enemy tank", () => {
    const w = makeWorld(["S...S"], [{ team: 0, kind: "m1" }, { team: 1, kind: "m1" }]);
    const [a, b] = [w.tanks[0]!, w.tanks[1]!];
    b.rot = Math.PI; // facing the shooter: front armor
    const events = run(w, 30, { [a.id]: { fire: true } });
    expect(events.some((e) => e.type === "hit" && e.targetId === b.id)).toBe(true);
    expect(b.hp).toBe(tankDefs.m1.hp - (tankDefs.m1.gun.damage - tankDefs.m1.armor));
  });

  it("damage the first wall they reach", () => {
    const w = makeWorld(["S.#.S"], [{ team: 0, kind: "m1" }, { team: 1, kind: "m1" }]);
    const [a, b] = [w.tanks[0]!, w.tanks[1]!];
    run(w, 30, { [a.id]: { fire: true } });
    expect(b.hp).toBe(tankDefs.m1.hp);
    expect(w.structures[0]!.hp).toBeLessThan(w.structures[0]!.maxHp);
  });

  it("splash also hurts the shooter at the reduced self factor", () => {
    const w = makeWorld(["S#"], [{ team: 0, kind: "goliath" }]);
    const t = w.tanks[0]!;
    t.pos.x = 10 - tankDefs.goliath.radius - 0.1;
    run(w, 3, { [t.id]: { fire: true } });
    expect(t.hp).toBeLessThan(tankDefs.goliath.hp);
  });
});

describe("hitscan", () => {
  it("hits instantly along the turret", () => {
    const w = makeWorld(["S..S"], [{ team: 0, kind: "moto" }, { team: 1, kind: "m1" }]);
    const [a, b] = [w.tanks[0]!, w.tanks[1]!];
    run(w, 1, { [a.id]: { fire: true } });
    expect(b.hp).toBeLessThan(tankDefs.m1.hp);
  });
});
