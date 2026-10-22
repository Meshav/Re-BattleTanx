import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Vec2 } from "../math/vec2.ts";
import type { RayHit } from "../queries/raycast.ts";
import type { Turret } from "../entities/turret.ts";
import { applyDamage, hitStructure } from "./applyDamage.ts";

export function damageTurret(t: Turret, amount: number): SimEvent[] {
  t.hp -= amount;
  return t.hp > 0 ? [] : [{ type: "explode", pos: { ...t.pos }, radius: 3 }];
}

/** Apply a direct hit to whatever a ray found. */
export function damageAt(world: World, hit: RayHit, amount: number, sourceId: number, from: Vec2): SimEvent[] {
  if (hit.kind === "tank") return applyDamage(world, { target: hit.tank, amount, sourceId, from });
  if (hit.kind === "turret") return damageTurret(hit.turret, amount);
  if (hit.kind === "structure" && hit.structure) return hitStructure(world, hit.structure, amount, sourceId);
  return [];
}
