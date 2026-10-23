import { activeGuided, moveTank, type InputState, type Tank, type World } from "@re-tanx/sim";
import type { Pose } from "./views/tankView.ts";

/** Preview the fraction since the last tick from live input, without changing the simulation. */
export function playerPose(world: World, tank: Tank, input: InputState, alpha: number): Pose {
  const preview = { ...tank, pos: { ...tank.pos } };
  if (tank.alive && alpha > 0 && !world.mode.over && !world.mode.countdown) {
    const raw = activeGuided(world, tank.id) ? { ...input, throttle: 0, steer: 0 } : input;
    moveTank({ ...world, dt: world.dt * Math.min(1, alpha) }, preview, raw);
  }
  return { x: preview.pos.x, y: preview.pos.y, rot: preview.rot, turretRot: preview.turretRot };
}
