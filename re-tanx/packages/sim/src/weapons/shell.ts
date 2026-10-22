import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import type { GunDef } from "../data/tankDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { add, fromAngle, scale } from "../math/vec2.ts";

/** Ballistic shell: spawns a projectile at the muzzle; stepProjectiles resolves the impact. */
export function fireShell(world: World, tank: Tank, gun: GunDef): SimEvent[] {
  const dir = fromAngle(tank.turretRot);
  const pos = add(tank.pos, scale(dir, tankDefs[tank.kind].radius + 0.5));
  world.projectiles.push({
    id: world.nextId++, ownerId: tank.id, pos, vel: scale(dir, gun.speed),
    damage: gun.damage, splash: gun.splash, ttl: gun.range / gun.speed,
  });
  return [{ type: "fire", tankId: tank.id, pos: { ...pos }, rot: tank.turretRot, weapon: "shell" }];
}
