import { rules } from "@re-tanx/sim";

/**
 * Steering keys are all-or-nothing, which snaps the hull into full-rate turns. Ease into a turn over
 * `rules.keySteerRamp` seconds like a stick being pushed over; stop dead on release or reversal.
 */
export function rampSteer(prev: number, want: number, dt: number): number {
  const from = want === 0 || Math.sign(want) !== Math.sign(prev) ? 0 : prev;
  const step = dt / rules.keySteerRamp;
  return want > 0 ? Math.min(want, from + step) : Math.max(want, from - step);
}
