import type { BotInput } from "../context.ts";
import { maxHp } from "../../entities/tank.ts";
import type { BotCtx } from "../context.ts";
import type { Vec2 } from "../../math/vec2.ts";
import { driveTo } from "../steering.ts";
import { angleOf, dist, sub } from "../../math/vec2.ts";
import { tankDefs } from "../../data/tankDefs.ts";
import { specialDefs } from "../../data/specialDefs.ts";
import { gunnery } from "../combat.ts";

const NUKE_DANGER = 120;

const nearbyNuke = (ctx: BotCtx) => ctx.world.nukes.find((n) => dist(n.pos, ctx.tank.pos) < NUKE_DANGER);

/** Low on health or a nuke is ticking: get away, toward a health crate if one is up. */
export const retreat = {
  score(ctx: BotCtx): number {
    if (nearbyNuke(ctx)) return 2;
    const frac = ctx.tank.hp / maxHp(ctx.tank);
    return frac < ctx.arch.retreatHp && ctx.threat ? 0.9 + (ctx.arch.retreatHp - frac) : 0;
  },
  act(ctx: BotCtx): BotInput {
    const { world, tank, bot, threat } = ctx;
    const nuke = nearbyNuke(ctx);
    const danger = nuke?.pos ?? threat ?? tank.pos;
    const goal = (nuke ? undefined : nearestHealth(ctx)) ?? farthestSpawn(ctx, danger);
    const drive = driveTo(world, tank, bot, goal);
    const g = gunnery(ctx, angleOf(sub(danger, tank.pos)));
    return { ...drive, ...g, special: false, cycle: 0 };
  },
};

function nearestHealth(ctx: BotCtx): Vec2 | undefined {
  const hs = ctx.world.pickups.filter((p) => p.active && p.kind === "health");
  return hs.sort((a, b) => dist(a.pos, ctx.tank.pos) - dist(b.pos, ctx.tank.pos))[0]?.pos;
}

function farthestSpawn(ctx: BotCtx, from: Vec2): Vec2 {
  const flee = specialDefs.nuke.flattenRadius;
  const spots = [...ctx.world.map.spawns].sort((a, b) => dist(b, from) - dist(a, from));
  return spots.find((s) => dist(s, from) > flee) ?? spots[0] ?? ctx.tank.pos;
}
