import type { World } from "../world.ts";
import type { Tank } from "../entities/tank.ts";
import type { BotState } from "./botState.ts";
import { aiDefs } from "../data/aiDefs.ts";
import { deg, wrapAngle } from "../math/angle.ts";
import { angleOf, dist, sub } from "../math/vec2.ts";
import { hasLineOfSight } from "../queries/raycast.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { perkMods } from "../progression/perks.ts";

const P = aiDefs.perception;

export function canSee(world: World, eye: Tank, other: Tank): boolean {
  const d = dist(eye.pos, other.pos);
  if (other.fx.cloak > 0 && d > specialDefs.cloak.revealRange) return false;
  if (d <= P.proximity) return true;
  if (d > P.visionRange) return false;
  const off = Math.abs(wrapAngle(angleOf(sub(other.pos, eye.pos)) - eye.turretRot));
  return off <= deg(P.visionCone) / 2 && hasLineOfSight(world, eye.pos, other.pos);
}

/** Vision, hearing (last tick's gunfire/explosions) and damage reveal; old memories fade. */
export function perceive(world: World, tank: Tank, bot: BotState): void {
  const now = world.tick;
  for (const m of Object.values(bot.memory)) m.visible = false;
  for (const e of world.tanks) {
    if (!e.alive || e.team === tank.team) continue;
    if (canSee(world, tank, e)) bot.memory[e.id] = { pos: { ...e.pos }, seenAt: now, visible: true };
  }
  for (const ev of world.recentEvents) {
    if (ev.type === "hit" && ev.targetId === tank.id) remember(world, bot, ev.sourceId, now);
    if (ev.type === "fire" && dist(ev.pos, tank.pos) <= P.hearGunfire * hearingOf(world, ev.tankId)) remember(world, bot, ev.tankId, now);
    if (ev.type === "explode" && dist(ev.pos, tank.pos) <= P.hearExplosion) {
      const near = world.tanks.find((t) => t.alive && t.team !== tank.team && dist(t.pos, ev.pos) < 25);
      if (near) remember(world, bot, near.id, now);
    }
  }
  const forgetBefore = now - P.memory * (1 / world.dt);
  for (const [id, m] of Object.entries(bot.memory)) {
    const t = world.tanks.find((k) => k.id === Number(id));
    if (m.seenAt < forgetBefore || !t?.alive) delete bot.memory[Number(id)];
  }
}

function remember(world: World, bot: BotState, id: number, now: number): void {
  const t = world.tanks.find((k) => k.id === id);
  if (!t?.alive || bot.memory[id]?.visible) return;
  bot.memory[id] = { pos: { ...t.pos }, seenAt: now, visible: false };
}

/** Keep the current target while visible; otherwise the nearest visible enemy, weighted toward weak ones. */
export function pickTarget(world: World, tank: Tank, bot: BotState): Tank | undefined {
  const visible = Object.entries(bot.memory).filter(([, m]) => m.visible).map(([id]) => world.tanks.find((t) => t.id === Number(id))!);
  const current = visible.find((t) => t.id === bot.targetId);
  if (current) return current;
  let best: Tank | undefined, bestScore = Infinity;
  for (const t of visible) {
    const score = dist(t.pos, tank.pos) + t.hp * 0.15;
    if (score < bestScore) { best = t; bestScore = score; }
  }
  return best;
}

/** Ghost Engine: quieter tanks are heard from closer. */
const hearingOf = (world: World, id: number): number => perkMods(world.tanks.find((t) => t.id === id)).hearing;
