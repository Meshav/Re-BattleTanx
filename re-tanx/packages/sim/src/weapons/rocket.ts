import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import type { GunDef } from "../data/tankDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { add, fromAngle, scale } from "../math/vec2.ts";
import { seekTarget } from "./swarm.ts";

/** Rattler rocket pods: a light rocket that curves toward whatever it was pointed near. */
export function fireRocket(world: World, tank: Tank, gun: GunDef): SimEvent[] {
  const pos = add(tank.pos, scale(fromAngle(tank.turretRot), tankDefs[tank.kind].radius + 0.8));
  world.missiles.push({
    id: world.nextId++, ownerId: tank.id, team: tank.team, kind: "rocket", pos, rot: tank.turretRot,
    speed: gun.speed, turnRate: gun.turnRate ?? 90, fuel: gun.range / gun.speed,
    targetId: seekTarget(world, tank, tank.turretRot, gun.seekCone), damage: gun.damage, splash: gun.splash,
  });
  return [{ type: "fire", tankId: tank.id, pos: { ...pos }, rot: tank.turretRot, weapon: "rocket" }];
}
