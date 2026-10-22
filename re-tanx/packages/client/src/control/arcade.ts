import { tankDefs, wrapAngle, type InputState, type Tank, type Vec2 } from "@re-tanx/sim";
import { axis, consumePress, type Keyboard } from "../input/keyboard.ts";
import { takeButton, type Mouse } from "../input/mouse.ts";
import { settings } from "../settings/settings.ts";

/**
 * WASD drives the hull, the mouse ground point aims the turret, left click fires.
 * Hover tanks: A/D strafe and the hull swings to face where you aim.
 */
export function arcadeInput(kb: Keyboard, mouse: Mouse, tank: Tank, aimPoint: Vec2 | undefined): InputState {
  const aim = aimPoint ? Math.atan2(aimPoint.y - tank.pos.y, aimPoint.x - tank.pos.x) : tank.turretRot;
  const b = settings().bindings;
  const side = axis(kb, [b.left], [b.right]);
  const hover = tankDefs[tank.kind].hover === true;
  return {
    throttle: axis(kb, [b.back], [b.forward]),
    // sim +rot turns toward +y, which is screen-right when the chase camera looks along the hull
    steer: hover ? faceAim(tank, aim) : side,
    strafe: hover ? side : 0,
    aim,
    fire: takeButton(mouse, "L") || kb.held.has(b.fire) || consumePress(kb, b.fire),
    special: takeButton(mouse, "R") || kb.held.has(b.special) || consumePress(kb, b.special),
    cycle: (consumePress(kb, b.next) ? 1 : 0) - (consumePress(kb, b.prev) ? 1 : 0),
  };
}

/** Steering value that turns the hull toward an angle (used by hover tanks). */
export const faceAim = (tank: Tank, aim: number): number => Math.max(-1, Math.min(1, wrapAngle(aim - tank.rot) * 3));
