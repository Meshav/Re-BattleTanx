import { expect, it } from "vitest";
import { idleInput } from "@re-tanx/sim";
import { createQueue, nextInput, pushInput } from "./inputs.ts";

it("uses the newest movement after a burst, without another five ticks of stale input", () => {
  const q = createQueue();
  for (let seq = 1; seq < 6; seq++) pushInput(q, seq, { ...idleInput(), throttle: 1 }, seq);
  pushInput(q, 6, { ...idleInput(2), steer: -1 }, 6);
  expect(nextInput(q)).toEqual({ ...idleInput(2), steer: -1 });
  expect(q.ack).toBe(6);
  expect(q.queue).toHaveLength(0);
  expect(nextInput(q).throttle).toBe(0);
  pushInput(q, 5, { ...idleInput(), throttle: 1 });
  expect(q.queue).toHaveLength(0);
});

it("preserves short action taps and their view tick, without repeating them after release", () => {
  const q = createQueue();
  pushInput(q, 1, { ...idleInput(), fire: true, special: true, cycle: 1 }, 10);
  pushInput(q, 2, idleInput(), 11);
  expect(nextInput(q)).toMatchObject({ fire: true, special: true, cycle: 1 });
  expect(q.view).toBe(10);
  expect(nextInput(q)).toEqual(idleInput());
  expect(q.ack).toBe(2);
});
