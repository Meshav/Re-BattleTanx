/** Screen rect in CSS pixels, origin top-left. */
export interface Rect { x: number; y: number; w: number; h: number }

/** 1 = full, 2 = side by side, 3–4 = quadrants (the third player gets the bottom-left). */
export function layoutViewports(n: number, w: number, h: number): Rect[] {
  if (n <= 1) return [{ x: 0, y: 0, w, h }];
  if (n === 2) return [{ x: 0, y: 0, w: w / 2, h }, { x: w / 2, y: 0, w: w / 2, h }];
  const hw = w / 2, hh = h / 2;
  return [{ x: 0, y: 0, w: hw, h: hh }, { x: hw, y: 0, w: hw, h: hh }, { x: 0, y: hh, w: hw, h: hh }, { x: hw, y: hh, w: hw, h: hh }].slice(0, n);
}
