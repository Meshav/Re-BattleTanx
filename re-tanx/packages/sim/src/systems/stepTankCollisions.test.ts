import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { dist } from "../math/vec2.ts";

describe("tank collisions", () => {
  it("never leaves tanks overlapping", () => {
    const w = makeWorld(["S.S"], [{ team: 0, kind: "m1" }, { team: 1, kind: "m1" }]);
    const [a, b] = [w.tanks[0]!, w.tanks[1]!];
    b.rot = Math.PI;
    run(w, 60, { [a.id]: { throttle: 1 }, [b.id]: { throttle: 1 } });
    expect(dist(a.pos, b.pos)).toBeGreaterThanOrEqual(tankDefs.m1.radius * 2 - 0.01);
  });

  it("a fast heavy ram damages a light tank more than itself", () => {
    const w = makeWorld(["S....S"], [{ team: 0, kind: "goliath" }, { team: 1, kind: "moto" }]);
    const [g, m] = [w.tanks[0]!, w.tanks[1]!];
    g.speed = tankDefs.goliath.speed;
    m.rot = Math.PI;
    m.speed = tankDefs.moto.speed;
    m.pos.x = g.pos.x + 6;
    run(w, 3, { [g.id]: { throttle: 1 }, [m.id]: { throttle: 1 } });
    const lostM = tankDefs.moto.hp - m.hp, lostG = tankDefs.goliath.hp - g.hp;
    expect(lostM).toBeGreaterThan(lostG);
    expect(lostM).toBeGreaterThan(0);
  });
});
