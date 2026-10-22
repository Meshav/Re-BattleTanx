import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { add, fromAngle, scale } from "../math/vec2.ts";
import { cellOf, isSolidCell } from "../queries/cells.ts";

const def = specialDefs.turret;

/** Drop an automated sentry gun behind the tank (or in front / underneath if a wall is in the way). */
export function placeSentry(world: World, tank: Tank): SimEvent[] {
  const off = tankDefs[tank.kind].radius + 2;
  const spots = [add(tank.pos, scale(fromAngle(tank.rot + Math.PI), off)), add(tank.pos, scale(fromAngle(tank.rot), off)), { ...tank.pos }];
  const pos = spots.find((p) => {
    const { cx, cy } = cellOf(world, p);
    return !isSolidCell(world, cx, cy);
  })!;
  world.turrets.push({ id: world.nextId++, ownerId: tank.id, team: tank.team, pos, rot: tank.turretRot, hp: def.hp, life: def.life, cooldown: 0 });
  return [{ type: "special", tankId: tank.id, kind: "turret", super: false, pos }];
}
