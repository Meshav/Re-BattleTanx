import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import type { GunDef } from "../data/tankDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { deg, wrapAngle } from "../math/angle.ts";
import { add, angleOf, dist, fromAngle, scale, sub } from "../math/vec2.ts";

/** Effective range: sentinels reach further once they've stopped and dug in. */
export function gunRange(tank: Tank): number {
  const def = tankDefs[tank.kind];
  const deployed = def.deployBonus && tank.stillFor >= (def.deployAfter ?? 1);
  return def.gun.range * (deployed ? def.deployBonus! : 1);
}

/**
 * Indirect fire over buildings. Lands on the nearest enemy close to the turret line
 * (within the assist cone and range), otherwise at full range.
 */
export function fireMortar(world: World, tank: Tank, gun: GunDef): SimEvent[] {
  const range = gunRange(tank);
  const cone = deg(gun.assistCone ?? 10);
  const target = world.tanks
    .filter((t) => t.alive && t.team !== tank.team && dist(t.pos, tank.pos) <= range && Math.abs(wrapAngle(angleOf(sub(t.pos, tank.pos)) - tank.turretRot)) <= cone)
    .sort((a, b) => dist(a.pos, tank.pos) - dist(b.pos, tank.pos))[0];
  const land = target ? { ...target.pos } : add(tank.pos, scale(fromAngle(tank.turretRot), range));
  const d = dist(land, tank.pos);
  const dir = scale(sub(land, tank.pos), 1 / (d || 1));
  world.projectiles.push({ id: world.nextId++, ownerId: tank.id, pos: { ...tank.pos }, vel: scale(dir, gun.speed), damage: gun.damage, splash: gun.splash, ttl: d / gun.speed, lobbed: true });
  return [{ type: "fire", tankId: tank.id, pos: { ...tank.pos }, rot: tank.turretRot, weapon: "mortar" }];
}
