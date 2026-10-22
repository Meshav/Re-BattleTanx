import { activeGuided, type Tank, type World } from "@re-tanx/sim";
import { poseAt, type Poses } from "../render/worldView.ts";
import type { Pose } from "../render/views/tankView.ts";

/** Follow the player's guided missile while it's being steered, else their tank. */
export function cameraPose(world: World, prev: Poses, tank: Tank, alpha: number, own?: Pose): Pose {
  const m = activeGuided(world, tank.id);
  if (m) return { x: m.pos.x, y: m.pos.y, rot: m.rot, turretRot: m.rot };
  return own ?? poseAt(prev, world, tank.id, alpha)!;
}
