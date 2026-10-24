import type { SimEvent } from "../events.ts";
import type { World } from "../world.ts";
import { weaponPower } from "../progression/levels.ts";
import { weaponLevelIn } from "../progression/stats.ts";
import type { Tank } from "../entities/tank.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { maxHp } from "../entities/tank.ts";

/** A stored health pickup, used on demand. Upgraded kits heal more. */
export function useHealthKit(world: World, tank: Tank): SimEvent[] {
  tank.hp = Math.min(maxHp(tank), tank.hp + specialDefs.health.heal * weaponPower(weaponLevelIn(world, tank, "health")));
  return [{ type: "special", tankId: tank.id, kind: "health", super: false, pos: { ...tank.pos } }];
}
