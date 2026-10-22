import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { add, fromAngle, scale, type Vec2 } from "../math/vec2.ts";

const def = specialDefs.mine;

/** Drop behind the hull; super lays a ring around the tank. */
export function dropMine(world: World, tank: Tank, isSuper: boolean, count: number): SimEvent[] {
  const spots: Vec2[] = isSuper
    ? Array.from({ length: count }, (_, i) => add(tank.pos, scale(fromAngle((i / count) * Math.PI * 2), def.super.ringRadius)))
    : [add(tank.pos, scale(fromAngle(tank.rot + Math.PI), tankDefs[tank.kind].radius + 1.5))];
  for (const pos of spots) world.mines.push({ id: world.nextId++, ownerId: tank.id, team: tank.team, pos, armIn: def.armTime });
  return [{ type: "special", tankId: tank.id, kind: "mine", super: isSuper, pos: { ...tank.pos } }];
}
