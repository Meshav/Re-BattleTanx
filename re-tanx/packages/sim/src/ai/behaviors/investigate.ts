import type { BotInput } from "../context.ts";
import type { BotCtx } from "../context.ts";
import { driveTo } from "../steering.ts";
import { angleOf, sub } from "../../math/vec2.ts";
import { gunnery } from "../combat.ts";

/** Heard or lost someone: go and look. */
export const investigate = {
  score: (ctx: BotCtx): number => (!ctx.target && ctx.threat ? 0.5 : 0),
  act(ctx: BotCtx): BotInput {
    const { world, tank, bot, threat } = ctx;
    if (!threat) return { throttle: 0, steer: 0, aim: tank.turretRot, fire: false, special: false, cycle: 0 };
    const drive = driveTo(world, tank, bot, threat);
    return { ...drive, ...gunnery(ctx, angleOf(sub(threat, tank.pos))), special: false, cycle: 0 };
  },
};
