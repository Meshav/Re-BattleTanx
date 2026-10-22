import type { BotInput } from "../context.ts";
import type { BotCtx } from "../context.ts";
import { driveTo, headTo } from "../steering.ts";
import { angleOf, dist, sub } from "../../math/vec2.ts";
import { gunnery } from "../combat.ts";
import { campaignDefs } from "../../campaign/missionDefs.ts";

const F = campaignDefs.wingmanFollow;
const YIELD = 6;

const leaderOf = (ctx: BotCtx) => ctx.world.tanks.find((t) => t.id === ctx.bot.leaderId && t.alive);

/** Wingman: stay 10–20 m behind the player, regroup when left behind, get out of their way up close. */
export const follow = {
  score(ctx: BotCtx): number {
    const leader = leaderOf(ctx);
    if (!leader) return 0;
    const d = dist(leader.pos, ctx.tank.pos);
    if (d > F.far * 2) return 0.9;
    return d > F.far ? 0.7 : d < YIELD ? 0.8 : 0.3;
  },
  act(ctx: BotCtx): BotInput {
    const { world, tank, bot } = ctx;
    const leader = leaderOf(ctx);
    // the leader can die between 5 Hz thinks; hold still until the brain re-picks
    if (!leader) return { throttle: 0, steer: 0, aim: tank.turretRot, fire: false, special: false, cycle: 0 };
    const d = dist(leader.pos, tank.pos);
    const toLeader = angleOf(sub(leader.pos, tank.pos));
    const g = gunnery(ctx, leader.turretRot);
    if (d < YIELD) return { ...headTo(tank, toLeader), throttle: -0.7, ...g, special: false, cycle: 0 };
    if (d <= F.near) return { throttle: 0, steer: 0, ...g, special: false, cycle: 0 };
    const behind = { x: leader.pos.x - Math.cos(leader.rot) * F.near, y: leader.pos.y - Math.sin(leader.rot) * F.near };
    return { ...driveTo(world, tank, bot, behind), ...g, special: false, cycle: 0 };
  },
};
