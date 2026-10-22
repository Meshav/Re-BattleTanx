import type { BotCtx } from "./context.ts";
import { activeGuided } from "../weapons/guided.ts";
import { angleOf, sub } from "../math/vec2.ts";
import { wrapAngle } from "../math/angle.ts";
import { clamp } from "../math/clamp.ts";

/** While a bot's guided missile flies, steer it at the remembered target. */
export function steerGuided(ctx: BotCtx): number | undefined {
  const m = activeGuided(ctx.world, ctx.tank.id);
  if (!m) return undefined;
  const goal = ctx.target?.pos ?? ctx.threat;
  if (!goal) return 0;
  return clamp(wrapAngle(angleOf(sub(goal, m.pos)) - m.rot) * 3, -1, 1);
}
