import type { BotCtx, BotInput } from "../context.ts";
import { driveTo } from "../steering.ts";
import { angleOf, sub } from "../../math/vec2.ts";
import { gunnery } from "../combat.ts";

/** Campaign runners: floor it to the exit, shooting back on the way. Nothing outranks this. */
export const escape = {
  score: (ctx: BotCtx): number => (ctx.bot.escapeTo ? 3 : 0),
  act(ctx: BotCtx): BotInput {
    const goal = ctx.bot.escapeTo!;
    return { ...driveTo(ctx.world, ctx.tank, ctx.bot, goal), ...gunnery(ctx, angleOf(sub(goal, ctx.tank.pos))), special: false, cycle: 0 };
  },
};
