import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import type { GunDef } from "../data/tankDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { deg, wrapAngle } from "../math/angle.ts";
import { add, angleOf, dist, fromAngle, scale, sub } from "../math/vec2.ts";
import { hasLineOfSight } from "../queries/raycast.ts";
import { cellOf, structureAt } from "../queries/cells.ts";
import { applyDamage, hitStructure } from "../systems/applyDamage.ts";

/** Short cone of fire: hurts everything in front and sets tanks burning. Can't reach through walls. */
export function fireFlame(world: World, tank: Tank, gun: GunDef): SimEvent[] {
  const half = deg(gun.cone ?? 30) / 2;
  const events: SimEvent[] = [{ type: "fire", tankId: tank.id, pos: { ...tank.pos }, rot: tank.turretRot, weapon: "flame" }];
  for (const t of world.tanks) {
    if (!t.alive || t.team === tank.team) continue;
    const d = dist(t.pos, tank.pos) - tankDefs[t.kind].radius;
    const off = Math.abs(wrapAngle(angleOf(sub(t.pos, tank.pos)) - tank.turretRot));
    if (d > gun.range || off > half || !hasLineOfSight(world, tank.pos, t.pos)) continue;
    events.push(...applyDamage(world, { target: t, amount: gun.damage, sourceId: tank.id, from: tank.pos }));
    Object.assign(t.fx, { burn: gun.burn ?? 0, burnDps: gun.burnDps ?? 0, burnBy: tank.id });
  }
  const tip = add(tank.pos, scale(fromAngle(tank.turretRot), Math.min(gun.range, tankDefs[tank.kind].radius + 4)));
  const { cx, cy } = cellOf(world, tip);
  const s = structureAt(world, cx, cy);
  if (s) events.push(...hitStructure(world, s, gun.damage, tank.id));
  return events;
}
