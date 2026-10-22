import type { BotInput } from "../context.ts";
import { maxHp } from "../../entities/tank.ts";
import type { BotCtx } from "../context.ts";
import type { Pickup } from "../../entities/pickup.ts";
import { driveTo } from "../steering.ts";
import { angleOf, dist, sub } from "../../math/vec2.ts";
import { tankDefs } from "../../data/tankDefs.ts";
import { aiDefs } from "../../data/aiDefs.ts";
import { gunnery } from "../combat.ts";

/** How much this crate is worth to this tank right now (0 = ignore). */
function value(ctx: BotCtx, p: Pickup): number {
  const t = ctx.tank;
  const hpFrac = t.hp / maxHp(t);
  const hasSpecials = Object.keys(t.specials).length > 0;
  if (p.kind === "health" || p.kind === "star") return hpFrac < 0.65 ? 0.4 + (1 - hpFrac) * 0.5 : 0.1;
  if (p.kind === "shield") return t.shield > 0 ? 0 : 0.45;
  if (p.kind === "ammo") return t.selected ? 0.3 : 0;
  return hasSpecials ? 0.3 : 0.5;
}

function best(ctx: BotCtx): { p: Pickup; v: number } | undefined {
  let out: { p: Pickup; v: number } | undefined;
  for (const p of ctx.world.pickups) {
    if (!p.active) continue;
    const d = dist(p.pos, ctx.tank.pos);
    if (d > aiDefs.pickupRange) continue;
    const v = value(ctx, p) * ctx.arch.pickup * (1 - d / (aiDefs.pickupRange * 2));
    if (!out || v > out.v) out = { p, v };
  }
  return out;
}

export const seekPickup = {
  score(ctx: BotCtx): number {
    const b = best(ctx);
    ctx.bot.pickupId = b?.p.id;
    return b ? b.v * (ctx.target ? 0.7 : 1) : 0;
  },
  act(ctx: BotCtx): BotInput {
    const { world, tank, bot } = ctx;
    const p = world.pickups.find((k) => k.id === bot.pickupId && k.active);
    if (!p) return { throttle: 0, steer: 0, aim: tank.turretRot, fire: false, special: false, cycle: 0 };
    const drive = driveTo(world, tank, bot, p.pos);
    return { ...drive, ...gunnery(ctx, angleOf(sub(p.pos, tank.pos))), special: false, cycle: 0 };
  },
};
