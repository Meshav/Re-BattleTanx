import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { add, fromAngle, scale } from "../math/vec2.ts";

const def = specialDefs.plasma;

/** Slow bolt, huge splash. Super: three bolts in a fan. */
export function firePlasma(world: World, tank: Tank, isSuper: boolean): SimEvent[] {
  const n = isSuper ? def.super.bolts : 1;
  for (let i = 0; i < n; i++) {
    const rot = tank.turretRot + (i - (n - 1) / 2) * 0.25;
    const dir = fromAngle(rot);
    world.projectiles.push({
      id: world.nextId++, ownerId: tank.id, pos: add(tank.pos, scale(dir, tankDefs[tank.kind].radius + 1)),
      vel: scale(dir, def.speed), damage: def.damage, splash: def.splash, ttl: def.range / def.speed, weapon: "plasma",
    });
  }
  return [{ type: "special", tankId: tank.id, kind: "plasma", super: isSuper, pos: { ...tank.pos } }];
}
