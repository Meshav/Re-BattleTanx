import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { add, angleOf, dist, fromAngle, scale, sub } from "../math/vec2.ts";
import { TURRET_RADIUS } from "../entities/turret.ts";
import { hasLineOfSight, raycast } from "../queries/raycast.ts";
import { damageAt } from "./damageAt.ts";

const def = specialDefs.turret;

/** Sentries snap to the nearest visible enemy and chatter away until they expire or get destroyed. */
export function stepTurrets(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  world.turrets = world.turrets.filter((t) => {
    t.life -= world.dt;
    t.cooldown = Math.max(0, t.cooldown - world.dt);
    if (t.life <= 0 || t.hp <= 0) return false;
    const target = world.tanks
      .filter((e) => e.alive && e.team !== t.team && e.fx.cloak <= 0 && dist(e.pos, t.pos) <= def.range && hasLineOfSight(world, t.pos, e.pos))
      .sort((a, b) => dist(a.pos, t.pos) - dist(b.pos, t.pos))[0];
    if (!target || t.cooldown > 0) return true;
    t.rot = angleOf(sub(target.pos, t.pos));
    t.cooldown = def.rate;
    // start the ray outside our own housing so ownerless (campaign) emplacements don't shoot themselves
    const muzzle = add(t.pos, scale(fromAngle(t.rot), TURRET_RADIUS + 0.5));
    const hit = raycast(world, muzzle, t.rot, def.range, t.ownerId);
    events.push({ type: "fire", tankId: t.ownerId, pos: { ...hit.pos }, rot: t.rot, weapon: "turret" });
    events.push(...damageAt(world, hit, def.damage, t.ownerId, t.pos));
    return true;
  });
  return events;
}
