import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { rules } from "../data/rules.ts";
import { applyDamage } from "./applyDamage.ts";
import { resolveWalls } from "./resolveWalls.ts";
import { perkMods } from "../progression/perks.ts";

const velocity = (t: Tank) => ({ x: Math.cos(t.rot) * t.speed, y: Math.sin(t.rot) * t.speed });

/** Separate overlapping tanks; a fast enough impact deals ram damage scaled by mass ratio. */
export function stepTankCollisions(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  const live = world.tanks.filter((t) => t.alive);
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i]!, b = live[j]!;
      events.push(...collidePair(world, a, b));
    }
  }
  return events;
}

function collidePair(world: World, a: Tank, b: Tank): SimEvent[] {
  const ra = tankDefs[a.kind].radius, rb = tankDefs[b.kind].radius;
  const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
  const d = Math.hypot(dx, dy) || 1e-6;
  const overlap = ra + rb - d;
  if (overlap <= 0) return [];
  const nx = dx / d, ny = dy / d;
  const va = velocity(a), vb = velocity(b);
  const closing = (va.x - vb.x) * nx + (va.y - vb.y) * ny;
  a.pos.x -= nx * overlap / 2; a.pos.y -= ny * overlap / 2;
  b.pos.x += nx * overlap / 2; b.pos.y += ny * overlap / 2;
  resolveWalls(world, a);
  resolveWalls(world, b);
  if (closing < rules.rammingMinSpeed) return [];
  a.speed *= 0.3;
  b.speed *= 0.3;
  const ma = tankDefs[a.kind].hp, mb = tankDefs[b.kind].hp;
  const fa = (tankDefs[a.kind].ramFactor ?? 1) * perkMods(a).ram, fb = (tankDefs[b.kind].ramFactor ?? 1) * perkMods(b).ram;
  return [
    ...applyDamage(world, { target: b, amount: (ma / mb) * closing * rules.rammingFactor * fa, sourceId: a.id, from: a.pos }),
    ...applyDamage(world, { target: a, amount: (mb / ma) * closing * rules.rammingFactor * 0.5 * fb, sourceId: b.id, from: b.pos }),
  ];
}
