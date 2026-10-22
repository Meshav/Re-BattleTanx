import type { World } from "../world.ts";
import type { Tank } from "../entities/tank.ts";
import type { BotState } from "./botState.ts";
import type { Vec2 } from "../math/vec2.ts";
import { angleOf, dist, sub } from "../math/vec2.ts";
import { wrapAngle } from "../math/angle.ts";
import { clamp } from "../math/clamp.ts";
import { aiDefs } from "../data/aiDefs.ts";
import { findPath } from "./nav/grid.ts";
import { tankDefs } from "../data/tankDefs.ts";

export interface Drive { throttle: number; steer: number }

const REPLAN_TICKS = 30;
const ARRIVE = 4;

/** Steer toward a heading: turn in place when it's far off, drive when roughly aligned. */
export function headTo(tank: Tank, heading: number, speed = 1): Drive {
  const diff = wrapAngle(heading - tank.rot);
  const steer = clamp(diff * 2.5, -1, 1);
  const throttle = Math.abs(diff) > 1.2 ? 0.15 : speed * Math.max(0.3, Math.cos(diff));
  return { throttle, steer };
}

/** Follow an A* path to `goal`, replanning on a timer or when the goal moves; backs out when stuck. */
export function driveTo(world: World, tank: Tank, bot: BotState, goal: Vec2, speed = 1): Drive {
  if (world.tick < bot.reverseUntilTick) return { throttle: -1, steer: 0.6 };
  const goalMoved = !bot.pathGoal || dist(bot.pathGoal, goal) > world.map.cell;
  if (goalMoved || world.tick >= bot.replanTick) {
    bot.path = findPath(world, tank.pos, goal, tankDefs[tank.kind].hover === true) ?? [];
    bot.pathGoal = { ...goal };
    bot.replanTick = world.tick + REPLAN_TICKS;
  }
  while (bot.path.length && dist(bot.path[0]!, tank.pos) < ARRIVE) bot.path.shift();
  const next = bot.path[0] ?? goal;
  if (dist(next, tank.pos) < ARRIVE) return { throttle: 0, steer: 0 };
  const drive = headTo(tank, angleOf(sub(next, tank.pos)), speed);
  watchStuck(world, tank, bot, drive);
  return drive;
}

function watchStuck(world: World, tank: Tank, bot: BotState, drive: Drive): void {
  bot.stuckTicks = drive.throttle > 0.5 && Math.abs(tank.speed) < 0.8 ? bot.stuckTicks + 1 : 0;
  if (bot.stuckTicks < aiDefs.stuckTime / world.dt) return;
  bot.stuckTicks = 0;
  bot.reverseUntilTick = world.tick + 20;
  bot.replanTick = world.tick;
}
