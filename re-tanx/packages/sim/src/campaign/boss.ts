import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import type { TankKind } from "../data/tankDefs.ts";
import { addTank, faceCentre } from "../world.ts";
import { maxHp } from "../entities/tank.ts";
import { campaignDefs } from "./missionDefs.ts";
import { nextRandom } from "../math/rng.ts";
import { dist } from "../math/vec2.ts";
import { applySplash } from "../systems/applySplash.ts";
import { shockwave } from "../weapons/shockwave.ts";

const B = campaignDefs.boss;

/** Per-boss script state. Phases change at 66% / 33% HP (doc 04 §4.6). */
export interface BossState { tankId: number; phase: number; barrageIn: number }
/** A telegraphed artillery strike: a ground marker, then the hit `fuse` seconds later. */
export interface Strike { id: number; ownerId: number; pos: { x: number; y: number }; fuse: number }

export const phaseFor = (hpFrac: number): number => B.phases.filter((p) => hpFrac <= p).length - 1;

export function stepBosses(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  for (const b of world.bosses) {
    const boss = world.tanks.find((t) => t.id === b.tankId);
    if (!boss?.alive) continue;
    const phase = phaseFor(boss.hp / maxHp(boss));
    if (phase > b.phase) events.push(...enterPhase(world, b, boss, phase));
    b.barrageIn -= world.dt;
    if (b.barrageIn <= 0) events.push(...barrage(world, b, boss));
    const near = world.tanks.some((t) => t.alive && t.team !== boss.team && dist(t.pos, boss.pos) < B.shockRange);
    if (phase >= 1 && near && boss.specialCooldown <= 0) {
      boss.specialCooldown = 5;
      events.push(...shockwave(world, boss, "shock"));
    }
  }
  return [...events, ...stepStrikes(world)];
}

function enterPhase(world: World, b: BossState, boss: Tank, phase: number): SimEvent[] {
  b.phase = phase;
  if (phase === 2 && B.enrageBoost) boss.fx.boost = 9999;
  const adds = (B.adds[phase] ?? []) as TankKind[];
  adds.forEach((kind, i) => {
    const t = addTank(world, { team: boss.team, kind, bot: "normal", name: "Guard" }, 0);
    t.pos = { x: boss.pos.x + (i ? 8 : -8), y: boss.pos.y + 6 };
    t.rot = t.turretRot = faceCentre(world, t.pos);
    world.campaign?.waveTanks.at(-1)?.push(t.id);
  });
  return [{ type: "bossPhase", tankId: boss.id, phase }, { type: "explode", pos: { ...boss.pos }, radius: 4 }];
}

/** Mark a ring of strikes around the nearest enemy; they land after the fuse. */
function barrage(world: World, b: BossState, boss: Tank): SimEvent[] {
  const cfg = B.barrage[b.phase] ?? B.barrage[0]!;
  b.barrageIn = cfg.every;
  const target = world.tanks.filter((t) => t.alive && t.team !== boss.team).sort((x, y) => dist(x.pos, boss.pos) - dist(y.pos, boss.pos))[0];
  if (!target) return [];
  const events: SimEvent[] = [];
  for (let i = 0; i < cfg.strikes; i++) {
    const a = nextRandom(world.rng) * Math.PI * 2, r = i === 0 ? 0 : nextRandom(world.rng) * cfg.spread;
    const pos = { x: target.pos.x + Math.cos(a) * r, y: target.pos.y + Math.sin(a) * r };
    world.strikes.push({ id: world.nextId++, ownerId: boss.id, pos, fuse: B.strike.fuse });
    events.push({ type: "strikeWarn", pos: { ...pos }, radius: B.strike.radius });
  }
  return events;
}

function stepStrikes(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  world.strikes = world.strikes.filter((s) => {
    s.fuse -= world.dt;
    if (s.fuse > 0) return true;
    events.push(...applySplash(world, { pos: s.pos, radius: B.strike.radius, damage: B.strike.damage, sourceId: s.ownerId }));
    return false;
  });
  return events;
}
