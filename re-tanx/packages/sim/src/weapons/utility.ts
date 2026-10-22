import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import type { SpecialKind } from "../data/specialDefs.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { add, fromAngle, scale } from "../math/vec2.ts";
import { raycast } from "../queries/raycast.ts";

const ev = (tank: Tank, kind: SpecialKind): SimEvent => ({ type: "special", tankId: tank.id, kind, super: false, pos: { ...tank.pos } });

export function cloak(tank: Tank): SimEvent[] {
  tank.fx.cloak = specialDefs.cloak.duration;
  return [ev(tank, "cloak")];
}

export function boost(tank: Tank): SimEvent[] {
  tank.fx.boost = specialDefs.speed.duration;
  return [ev(tank, "speed")];
}

export function repair(tank: Tank): SimEvent[] {
  tank.fx.repair = specialDefs.repair.duration;
  return [ev(tank, "repair")];
}

/** Blink forward along the hull, stopping short of the first wall or tank. */
export function teleport(world: World, tank: Tank): SimEvent[] {
  const r = tankDefs[tank.kind].radius;
  const hit = raycast(world, tank.pos, tank.rot, specialDefs.teleport.distance + r, tank.id);
  const travel = Math.max(0, Math.hypot(hit.pos.x - tank.pos.x, hit.pos.y - tank.pos.y) - r - 0.5);
  const from = { ...tank.pos };
  tank.pos = add(tank.pos, scale(fromAngle(tank.rot), Math.min(travel, specialDefs.teleport.distance)));
  return [ev(tank, "teleport"), { type: "explode", pos: from, radius: 1.5 }];
}
