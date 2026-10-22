const TAU = Math.PI * 2;

/** Wrap to (-PI, PI]. */
export function wrapAngle(a: number): number {
  const w = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return w === -Math.PI ? Math.PI : w;
}

/** Rotate `from` toward `to` by at most `maxStep` radians. */
export function turnToward(from: number, to: number, maxStep: number): number {
  const d = wrapAngle(to - from);
  if (Math.abs(d) <= maxStep) return wrapAngle(to);
  return wrapAngle(from + Math.sign(d) * maxStep);
}

export const deg = (d: number): number => (d * Math.PI) / 180;
