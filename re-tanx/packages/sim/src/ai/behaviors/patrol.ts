import type { BotInput } from "../context.ts";
import type { BotCtx } from "../context.ts";
import type { Vec2 } from "../../math/vec2.ts";
import { driveTo } from "../steering.ts";
import { randomOpenPoint } from "../nav/grid.ts";
import { nextRandom } from "../../math/rng.ts";
import { dist } from "../../math/vec2.ts";
import { gunnery } from "../combat.ts";
import { specialDefs } from "../../data/specialDefs.ts";

/**
 * Nothing to do: head for the nearest enemy on radar (original multiplayer radar is always on, so a human knows
 * this too — and it stops end-game stalemates). Cloaked tanks don't show. Campaign has no free radar: roam.
 */
function radarGoal(ctx: BotCtx): Vec2 | undefined {
  if (ctx.world.campaign) return undefined;
  const reveal = specialDefs.cloak.revealRange;
  const seen = ctx.world.tanks.filter((t) => t.alive && t.team !== ctx.tank.team && (t.fx.cloak <= 0 || dist(t.pos, ctx.tank.pos) < reveal));
  return seen.sort((a, b) => dist(a.pos, ctx.tank.pos) - dist(b.pos, ctx.tank.pos))[0]?.pos;
}

export const patrol = {
  score: (): number => 0.2,
  act(ctx: BotCtx): BotInput {
    const { world, tank, bot } = ctx;
    const hunt = radarGoal(ctx);
    if (hunt) bot.roamGoal = hunt;
    else if (!bot.roamGoal || dist(bot.roamGoal, tank.pos) < 8) bot.roamGoal = randomOpenPoint(world, () => nextRandom(world.rng));
    const drive = driveTo(world, tank, bot, bot.roamGoal, 0.8);
    return { ...drive, ...gunnery(ctx, tank.rot), special: false, cycle: 0 };
  },
};
