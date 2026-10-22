import { tankDefs, wrapAngle, type InputState, type Tank, type World } from "@re-tanx/sim";
import { axis, consumePress, type Keyboard } from "../input/keyboard.ts";

export interface KeySet { up: string; down: string; left: string; right: string; fire: string; special: string; cycle: string }

/** Second keyboard player: arrows + Enter / Right Shift / "/" . */
export const ARROW_KEYS: KeySet = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", fire: "Enter", special: "ShiftRight", cycle: "Slash" };

const ASSIST_CONE = (15 * Math.PI) / 180;

/** Original "Classic" scheme: turret locked to the hull with a small auto-aim cone. */
export function classicInput(kb: Keyboard, keys: KeySet, tank: Tank, world: World): InputState {
  return {
    throttle: axis(kb, [keys.down], [keys.up]),
    steer: axis(kb, [keys.left], [keys.right]),
    strafe: 0,
    aim: assistedAim(tank, world),
    fire: kb.held.has(keys.fire) || consumePress(kb, keys.fire),
    special: kb.held.has(keys.special) || consumePress(kb, keys.special),
    cycle: consumePress(kb, keys.cycle) ? 1 : 0,
  };
}

function assistedAim(tank: Tank, world: World): number {
  const range = tankDefs[tank.kind].gun.range;
  let best = tank.rot, bestOff = ASSIST_CONE;
  for (const t of world.tanks) {
    if (!t.alive || t.team === tank.team || Math.hypot(t.pos.x - tank.pos.x, t.pos.y - tank.pos.y) > range) continue;
    const off = Math.abs(wrapAngle(Math.atan2(t.pos.y - tank.pos.y, t.pos.x - tank.pos.x) - tank.rot));
    if (off < bestOff) { best = tank.rot + wrapAngle(Math.atan2(t.pos.y - tank.pos.y, t.pos.x - tank.pos.x) - tank.rot); bestOff = off; }
  }
  return best;
}
