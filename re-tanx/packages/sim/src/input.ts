/** Per-tank intent for one tick. Produced by keyboard, gamepad, AI or network. */
export interface InputState {
  throttle: number; // -1..1
  steer: number; // -1..1, positive turns toward +rot; also steers an active guided missile
  /** hover tanks only: sideways thrust, -1..1 (positive = to the right of the hull) */
  strafe: number;
  aim: number; // absolute world angle the turret should face
  fire: boolean;
  special: boolean; // fire the selected special
  cycle: number; // -1, 0, +1: one-shot change of selected special
}

export const idleInput = (aim = 0): InputState => ({ throttle: 0, steer: 0, strafe: 0, aim, fire: false, special: false, cycle: 0 });
