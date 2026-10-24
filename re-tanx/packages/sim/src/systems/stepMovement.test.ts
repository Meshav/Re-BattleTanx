import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { rules } from "../data/rules.ts";

const open = ["..........", ".S........", "..........", ".........."];

describe("stepMovement", () => {
  it("accelerates to top speed along the hull", () => {
    const w = makeWorld(open, [{ team: 0, kind: "m1" }]);
    const t = w.tanks[0]!;
    t.rot = 0;
    run(w, 60, { [t.id]: { throttle: 1 } });
    expect(t.speed).toBeCloseTo(tankDefs.m1.speed);
    expect(t.pos.x).toBeGreaterThan(15);
    expect(t.pos.y).toBeCloseTo(15);
  });

  it("spawns facing the middle of the map", () => {
    const w = makeWorld(open, [{ team: 0, kind: "m1" }]);
    expect(w.tanks[0]!.rot).toBeCloseTo(Math.atan2(20 - 15, 50 - 15));
  });

  it("is stopped by a solid cell", () => {
    const w = makeWorld([".S#"], [{ team: 0, kind: "m1" }]);
    const t = w.tanks[0]!;
    run(w, 90, { [t.id]: { throttle: 1 } });
    expect(t.pos.x).toBeCloseTo(20 - tankDefs.m1.radius);
  });

  it("drives through rubble at reduced speed", () => {
    const w = makeWorld(["S#.."], [{ team: 0, kind: "m1" }]);
    const t = w.tanks[0]!;
    w.structures[0]!.stage = 2;
    run(w, 45, { [t.id]: { throttle: 1 } });
    expect(t.pos.x).toBeGreaterThan(12);
    expect(t.speed).toBeLessThanOrEqual(tankDefs.m1.speed * rules.rubbleSpeedFactor + 0.01);
  });

  it("brakes at brakeFactor × acceleration going forward and in reverse (no coasting)", () => {
    const stopTicks = Math.ceil((tankDefs.m1.accelTime / rules.brakeFactor) * rules.tickRate);
    for (const throttle of [1, -1]) {
      const w = makeWorld(open, [{ team: 0, kind: "m1" }]);
      const t = w.tanks[0]!;
      t.rot = 0;
      t.speed = throttle * tankDefs.m1.speed;
      run(w, stopTicks, { [t.id]: { throttle: 0 } });
      expect(t.speed).toBe(0);
    }
  });

  it("turns the turret toward the aim at turret rate", () => {
    const w = makeWorld(open, [{ team: 0, kind: "goliath" }]);
    const t = w.tanks[0]!;
    t.turretRot = 0;
    run(w, 1, { [t.id]: { aim: Math.PI / 2 } });
    expect(t.turretRot).toBeCloseTo((tankDefs.goliath.turretRate * Math.PI) / 180 / rules.tickRate);
  });
});
