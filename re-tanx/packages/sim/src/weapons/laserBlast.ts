import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { add, dist, fromAngle, scale } from "../math/vec2.ts";
import { raycast } from "../queries/raycast.ts";
import { applyDamage } from "../systems/applyDamage.ts";
import { damageAt } from "../systems/damageAt.ts";
import { withRewind } from "../systems/lagComp.ts";

const def = specialDefs.laser;

/** Heavy beam. Super: stronger, and it pierces every enemy tank on the line up to the first wall. */
export function fireLaserBlast(world: World, tank: Tank, isSuper: boolean): SimEvent[] {
  return withRewind(world, tank.id, () => beam(world, tank, isSuper));
}

function beam(world: World, tank: Tank, isSuper: boolean): SimEvent[] {
  const damage = def.damage * (isSuper ? def.super.damageMul : 1);
  const hit = raycast(world, tank.pos, tank.turretRot, def.range, tank.id, isSuper);
  const events: SimEvent[] = [
    { type: "special", tankId: tank.id, kind: "laser", super: isSuper, pos: { ...tank.pos } },
    { type: "fire", tankId: tank.id, pos: { ...hit.pos }, rot: tank.turretRot, weapon: "laser" },
  ];
  if (!isSuper) return [...events, ...damageAt(world, hit, damage, tank.id, tank.pos, "laser")];
  const wall = dist(hit.pos, tank.pos);
  const dir = fromAngle(tank.turretRot);
  for (const t of world.tanks) {
    if (!t.alive || t.team === tank.team) continue;
    const along = (t.pos.x - tank.pos.x) * dir.x + (t.pos.y - tank.pos.y) * dir.y;
    const off = dist(t.pos, add(tank.pos, scale(dir, along)));
    if (along > 0 && along < wall && off <= tankDefs[t.kind].radius) events.push(...applyDamage(world, { target: t, amount: damage, sourceId: tank.id, from: tank.pos, weapon: "laser" }));
  }
  return events;
}
