import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Projectile } from "../entities/projectile.ts";
import type { Tank } from "../entities/tank.ts";
import type { Structure } from "../entities/structure.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { add, dist, scale } from "../math/vec2.ts";
import { cellOf, isSolidCell, structureAt } from "../queries/cells.ts";
import { applyDamage, hitStructure } from "./applyDamage.ts";
import { applySplash } from "./applySplash.ts";
import { turretAt } from "../queries/raycast.ts";
import { damageTurret } from "./damageAt.ts";

const SWEEP = 1; // metres per collision sample, so fast shells can't skip a thin target

export function stepProjectiles(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  const survivors: Projectile[] = [];
  for (const p of world.projectiles) {
    p.ttl -= world.dt;
    if (p.lobbed) p.pos = add(p.pos, scale(p.vel, world.dt));
    const hit = p.lobbed ? undefined : sweep(world, p);
    if (hit) events.push(...impact(world, p, hit.tank, hit.structure));
    else if (p.ttl <= 0) events.push(...impact(world, p, undefined, undefined));
    else survivors.push(p);
  }
  world.projectiles = survivors;
  return events;
}

interface SweepHit { tank: Tank | undefined; structure: Structure | undefined }

/** Advance p along this tick's path; stop at the first tank or solid cell (start point included). */
function sweep(world: World, p: Projectile): SweepHit | undefined {
  const step = scale(p.vel, world.dt);
  const n = Math.max(1, Math.ceil(Math.hypot(step.x, step.y) / SWEEP));
  for (let i = 0; i <= n; i++) {
    if (i > 0) p.pos = add(p.pos, scale(step, 1 / n));
    const tank = world.tanks.find((t) => t.alive && t.id !== p.ownerId && dist(t.pos, p.pos) <= tankDefs[t.kind].radius);
    const turret = turretAt(world, p.pos, world.tanks.find((t) => t.id === p.ownerId)?.team ?? -1);
    if (turret && !tank) damageTurret(turret, p.damage);
    const { cx, cy } = cellOf(world, p.pos);
    const solid = isSolidCell(world, cx, cy);
    if (tank || solid || turret) return { tank, structure: solid ? structureAt(world, cx, cy) : undefined };
  }
  return undefined;
}

function impact(world: World, p: Projectile, tank: Tank | undefined, structure: Structure | undefined): SimEvent[] {
  if (p.splash > 0) return applySplash(world, { pos: p.pos, radius: p.splash, damage: p.damage, sourceId: p.ownerId, direct: tank, directStructure: structure });
  const events: SimEvent[] = [{ type: "explode", pos: { ...p.pos }, radius: 1 }];
  if (tank) events.push(...applyDamage(world, { target: tank, amount: p.damage, sourceId: p.ownerId, from: p.pos }));
  if (structure) events.push(...hitStructure(world, structure, p.damage, p.ownerId));
  return events;
}
