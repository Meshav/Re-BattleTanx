import { tankDefs, type InputState, type Tank } from "@re-tanx/sim";
import { faceAim } from "./arcade.ts";
import type { PadState } from "../input/gamepad.ts";

/** Left stick: throttle (Y) + steer (X). Right stick: turret direction relative to the camera. D-pad / X,Y cycle specials. */
export function twinStickInput(pad: PadState, last: PadState | undefined, tank: Tank, cameraYaw: number): InputState {
  const aiming = Math.hypot(pad.rx, pad.ry) > 0.3;
  // stick up = away from the camera = cameraYaw; stick right = +90° in sim space
  const aim = aiming ? cameraYaw + Math.atan2(pad.rx, -pad.ry) : tank.turretRot;
  const cycle = (pad.next && !last?.next ? 1 : 0) - (pad.prev && !last?.prev ? 1 : 0);
  const hover = tankDefs[tank.kind].hover === true; // left stick X strafes, hull follows the aim
  return { throttle: -pad.ly, steer: hover ? faceAim(tank, aim) : pad.lx, strafe: hover ? pad.lx : 0, aim, fire: pad.fire, special: pad.special, cycle };
}
