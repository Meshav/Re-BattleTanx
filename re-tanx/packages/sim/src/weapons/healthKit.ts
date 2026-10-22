import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { maxHp } from "../entities/tank.ts";

/** A stored health pickup, used on demand. */
export function useHealthKit(tank: Tank): SimEvent[] {
  tank.hp = Math.min(maxHp(tank), tank.hp + specialDefs.health.heal);
  return [{ type: "special", tankId: tank.id, kind: "health", super: false, pos: { ...tank.pos } }];
}
