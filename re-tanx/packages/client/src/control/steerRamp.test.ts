import { expect, it } from "vitest";
import { rules } from "@re-tanx/sim";
import { rampSteer } from "./steerRamp.ts";

const dt = 1 / rules.tickRate;

it("eases into a full turn, stops dead on release and on reversal", () => {
  let s = 0;
  const ticks = Math.round(rules.keySteerRamp / dt);
  for (let i = 0; i < ticks - 1; i++) s = rampSteer(s, 1, dt);
  expect(s).toBeGreaterThan(0.5);
  expect(s).toBeLessThan(1);
  s = rampSteer(rampSteer(s, 1, dt), 1, dt);
  expect(s).toBe(1);
  expect(rampSteer(s, 0, dt)).toBe(0);
  expect(rampSteer(s, -1, dt)).toBeCloseTo(-dt / rules.keySteerRamp);
});
