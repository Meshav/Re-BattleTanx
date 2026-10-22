/** Pointer position in normalized device coords and button state over the canvas. */
/** `clickedL/R` latch a press until the next sim tick reads it, so taps shorter than a tick still count. */
export interface Mouse { px: number; py: number; ndcX: number; ndcY: number; left: boolean; right: boolean; clickedL: boolean; clickedR: boolean; moved: boolean }

export function createMouse(canvas: HTMLCanvasElement): Mouse {
  const m: Mouse = { px: 0, py: 0, ndcX: 0, ndcY: 0, left: false, right: false, clickedL: false, clickedR: false, moved: false };
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    m.px = e.clientX - r.left;
    m.py = e.clientY - r.top;
    m.ndcX = ((e.clientX - r.left) / r.width) * 2 - 1;
    m.ndcY = -((e.clientY - r.top) / r.height) * 2 + 1;
    m.moved = true;
  });
  canvas.addEventListener("pointerdown", (e) => setButton(m, e.button, true));
  window.addEventListener("pointerup", (e) => setButton(m, e.button, false));
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  return m;
}

function setButton(m: Mouse, button: number, down: boolean): void {
  if (button === 0) m.left = down;
  if (button === 2) m.right = down;
  if (down && button === 0) m.clickedL = true;
  if (down && button === 2) m.clickedR = true;
}

/** Held now, or tapped since the last read. */
export function takeButton(m: Mouse, which: "L" | "R"): boolean {
  const held = which === "L" ? m.left : m.right;
  const tapped = which === "L" ? m.clickedL : m.clickedR;
  if (which === "L") m.clickedL = false;
  else m.clickedR = false;
  return held || tapped;
}
