import type { BotCtx } from "./context.ts";
import { maxHp } from "../entities/tank.ts";
import type { SpecialKind } from "../data/specialDefs.ts";
import { superThreshold } from "../data/specialDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { dist } from "../math/vec2.ts";
import { hasLineOfSight } from "../queries/raycast.ts";

/** Which special this bot wants to use this tick, if any (doc 06 §6.5 rules). */
export function wantSpecial(ctx: BotCtx): SpecialKind | undefined {
  const { tank, diff } = ctx;
  const allowed = (k: SpecialKind) => {
    const n = tank.specials[k] ?? 0;
    const th = superThreshold(k);
    return n > 0 && (diff.specials as string[]).includes(k) && (diff.superShots || th === undefined || n < th);
  };
  const order: [SpecialKind, () => boolean][] = [
    ["health", () => tank.hp < maxHp(tank) * 0.5],
    ["nuke", () => enemiesNear(ctx, 30) >= 2 && tank.hp > maxHp(tank) * 0.4],
    ["swarm", () => targetBetween(ctx, 15, 60, true)],
    ["guided", () => targetBetween(ctx, 20, 70, false)],
    ["mine", () => ctx.bot.behavior === "retreat" && !!ctx.threat && dist(ctx.threat, tank.pos) < 40],
    ["repair", () => tank.hp < maxHp(tank) * 0.6 && tank.fx.repair <= 0],
    ["edge", () => enemiesNear(ctx, 14) >= 1],
    ["shock", () => enemiesNear(ctx, 12) >= 1],
    ["laser", () => targetBetween(ctx, 0, 75, true)],
    ["plasma", () => targetBetween(ctx, 15, 60, true)],
    ["turret", () => !!ctx.threat && dist(ctx.threat, tank.pos) < 45 && (ctx.bot.behavior === "retreat" || ctx.bot.behavior === "objective")],
    ["cloak", () => ctx.bot.behavior === "retreat" && tank.fx.cloak <= 0],
    ["speed", () => (ctx.bot.behavior === "retreat" || ctx.bot.behavior === "objective") && tank.fx.boost <= 0],
    ["teleport", () => ctx.bot.behavior === "retreat"],
  ];
  return order.find(([k, when]) => allowed(k) && when())?.[0];
}

function enemiesNear(ctx: BotCtx, r: number): number {
  return ctx.world.tanks.filter((t) => t.alive && t.team !== ctx.tank.team && dist(t.pos, ctx.tank.pos) <= r).length;
}

function targetBetween(ctx: BotCtx, min: number, max: number, needLos: boolean): boolean {
  const t = ctx.target;
  if (!t) return false;
  const d = dist(t.pos, ctx.tank.pos);
  return d >= min && d <= max && (!needLos || hasLineOfSight(ctx.world, ctx.tank.pos, t.pos));
}

/** Turn a wanted special into input: cycle toward it, then fire once selected. */
export function specialInput(ctx: BotCtx, want: SpecialKind | undefined): { special: boolean; cycle: number } {
  if (!want || ctx.tank.specialCooldown > 0) return { special: false, cycle: 0 };
  if (ctx.tank.selected !== want) return { special: false, cycle: 1 };
  return { special: true, cycle: 0 };
}
