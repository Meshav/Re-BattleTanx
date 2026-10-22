import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import type { GunDef } from "../data/tankDefs.ts";
import { raycast } from "../queries/raycast.ts";
import { damageAt } from "../systems/damageAt.ts";
import { withRewind } from "../systems/lagComp.ts";

/** Instant-hit gun (machine guns, lasers): first tank or wall along the turret line. */
export function fireHitscan(world: World, tank: Tank, gun: GunDef): SimEvent[] {
  return withRewind(world, tank.id, () => {
    const hit = raycast(world, tank.pos, tank.turretRot, gun.range, tank.id);
    const events: SimEvent[] = [{ type: "fire", tankId: tank.id, pos: { ...hit.pos }, rot: tank.turretRot, weapon: gun.kind }];
    return [...events, ...damageAt(world, hit, gun.damage, tank.id, tank.pos)];
  });
}
