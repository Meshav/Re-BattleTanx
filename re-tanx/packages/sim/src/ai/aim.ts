import type { World } from "../world.ts";
import type { Tank } from "../entities/tank.ts";
import type { BotState } from "./botState.ts";
import { aiDefs } from "../data/aiDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { deg, wrapAngle } from "../math/angle.ts";
import { angleOf, dist, sub } from "../math/vec2.ts";
import { nextRandom } from "../math/rng.ts";
import { gunOf } from "../modes/rail.ts";

/** Turret angle at `target`, leading it by difficulty and wobbling by aim error (re-rolled twice a second). */
export function aimAt(world: World, tank: Tank, bot: BotState, target: Tank): number {
  const diff = aiDefs.difficulty[bot.difficulty];
  if (world.tick >= bot.aimRerollTick) {
    bot.aimOffset = (nextRandom(world.rng) * 2 - 1) * deg(diff.aimError);
    bot.aimRerollTick = world.tick + 15;
  }
  const gun = gunOf(world, tank);
  const travel = gun.speed > 0 ? dist(tank.pos, target.pos) / gun.speed : 0;
  const lead = travel * diff.lead;
  const aimPoint = {
    x: target.pos.x + Math.cos(target.rot) * target.speed * lead,
    y: target.pos.y + Math.sin(target.rot) * target.speed * lead,
  };
  return angleOf(sub(aimPoint, tank.pos)) + bot.aimOffset;
}

/** Close enough to the wanted angle to pull the trigger. */
export function aligned(tank: Tank, wanted: number, toleranceDeg = 8): boolean {
  return Math.abs(wrapAngle(wanted - tank.turretRot)) <= deg(toleranceDeg);
}
