import { tankDefs, type InputState, type Tank } from "@re-tanx/sim";
import { takeTap, type Touch } from "../input/touch.ts";
import { faceAim } from "./arcade.ts";

const AUTO_FIRE = 0.85;

/** Like twin-stick, relative to the camera; pushing the aim stick to the edge also fires. */
export function touchInput(t: Touch, tank: Tank, cameraYaw: number): InputState {
  const aiming = Math.hypot(t.rx, t.ry) > 0.3;
  const aim = aiming ? cameraYaw + Math.atan2(t.rx, -t.ry) : tank.turretRot;
  const hover = tankDefs[tank.kind].hover === true;
  return {
    throttle: -t.ly, steer: hover ? faceAim(tank, aim) : t.lx, strafe: hover ? t.lx : 0, aim,
    fire: t.fire || Math.hypot(t.rx, t.ry) > AUTO_FIRE, special: t.special, cycle: takeTap(t, "next") ? 1 : 0,
  };
}
