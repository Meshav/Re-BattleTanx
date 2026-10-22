import type { BotInput } from "../context.ts";
import type { BotCtx } from "../context.ts";
import { driveTo, headTo } from "../steering.ts";
import { angleOf, dist, sub } from "../../math/vec2.ts";
import { hasLineOfSight } from "../../queries/raycast.ts";
import { gunnery } from "../combat.ts";

/**
 * Fight at the archetype's preferred range: close in along a path, back off when too close,
 * otherwise circle the target so it's harder to hit.
 */
export const engage = {
  score: (ctx: BotCtx): number => (ctx.target ? 0.75 * ctx.diff.aggression * ctx.arch.engage : 0),
  act(ctx: BotCtx): BotInput {
    const { world, tank, bot, target, arch } = ctx;
    if (!target) return { throttle: 0, steer: 0, aim: tank.turretRot, fire: false, special: false, cycle: 0 };
    const d = dist(tank.pos, target.pos);
    const toTarget = angleOf(sub(target.pos, tank.pos));
    const los = hasLineOfSight(world, tank.pos, target.pos);
    let drive;
    if (!los || d > arch.range + 10) drive = driveTo(world, tank, bot, target.pos);
    else if (d < arch.range - 12) drive = { ...headTo(tank, toTarget), throttle: -0.8 }; // face it, back away
    else drive = headTo(tank, toTarget + (tank.id % 2 ? 1 : -1) * Math.PI / 2, 0.6);
    return { ...drive, ...gunnery(ctx, toTarget), special: false, cycle: 0 };
  },
};
