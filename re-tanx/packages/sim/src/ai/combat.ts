import type { InputState } from "../input.ts";
import type { BotCtx } from "./context.ts";
import { aimAt, aligned } from "./aim.ts";
import { hasLineOfSight } from "../queries/raycast.ts";
import { releaseToken, takeToken } from "./tokens.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { dist } from "../math/vec2.ts";
import { gunOf } from "../modes/rail.ts";

/** Turret + trigger for whatever the bot is doing: aim at the target, shoot when it's fair and lined up. */
export function gunnery(ctx: BotCtx, fallbackAim: number): Pick<InputState, "aim" | "fire"> {
  const { world, tank, bot, target } = ctx;
  if (!target) {
    releaseToken(bot);
    return { aim: fallbackAim, fire: false };
  }
  const aim = aimAt(world, tank, bot, target);
  const inRange = dist(tank.pos, target.pos) <= gunOf(world, tank).range;
  const ready = world.tick >= bot.reactReadyTick && inRange && aligned(tank, aim);
  const fire = ready && hasLineOfSight(world, tank.pos, target.pos) && takeToken(world, bot, target.id);
  return { aim, fire };
}
