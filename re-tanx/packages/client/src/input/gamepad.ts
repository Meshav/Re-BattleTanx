export interface PadState { lx: number; ly: number; rx: number; ry: number; fire: boolean; special: boolean; prev: boolean; next: boolean; back: boolean; start: boolean; connected: boolean }

const DEADZONE = 0.18;
const dz = (v: number | undefined): number => (v === undefined || Math.abs(v) < DEADZONE ? 0 : v);

/** Snapshot one gamepad (Gamepad API is poll-only). */
export function readPad(index: number): PadState {
  const gp = navigator.getGamepads?.()[index];
  if (!gp) return { lx: 0, ly: 0, rx: 0, ry: 0, fire: false, special: false, prev: false, next: false, back: false, start: false, connected: false };
  const btn = (i: number) => gp.buttons[i]?.pressed ?? false;
  return {
    lx: dz(gp.axes[0]), ly: dz(gp.axes[1]), rx: dz(gp.axes[2]), ry: dz(gp.axes[3]),
    fire: btn(7) || btn(5) || btn(0), special: btn(6) || btn(4) || btn(1), prev: btn(14) || btn(2), next: btn(15) || btn(3), back: btn(8), start: btn(9), connected: true,
  };
}
