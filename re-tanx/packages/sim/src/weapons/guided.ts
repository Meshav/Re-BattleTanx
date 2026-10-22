import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { add, fromAngle, scale } from "../math/vec2.ts";

const def = specialDefs.guided;

export const activeGuided = (world: World, tankId: number) =>
  world.missiles.find((m) => m.kind === "guided" && m.ownerId === tankId);

/** One player-steered missile at a time; super = triple warhead. */
export function fireGuided(world: World, tank: Tank, isSuper: boolean): SimEvent[] {
  if (activeGuided(world, tank.id)) return [];
  const pos = add(tank.pos, scale(fromAngle(tank.turretRot), tankDefs[tank.kind].radius + 1));
  world.missiles.push({
    id: world.nextId++, ownerId: tank.id, team: tank.team, kind: "guided",
    pos, rot: tank.turretRot, speed: def.speed, turnRate: def.turnRate, fuel: def.fuel, targetId: undefined,
    damage: def.damage * (isSuper ? def.super.damageMul : 1), splash: def.splash * (isSuper ? def.super.splashMul : 1),
  });
  return [{ type: "special", tankId: tank.id, kind: "guided", super: isSuper, pos }];
}
