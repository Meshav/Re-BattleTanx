import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Nuke } from "../entities/nuke.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { dist } from "../math/vec2.ts";
import { applyDamage, damageStructure } from "./applyDamage.ts";

const def = specialDefs.nuke;

export function stepNukes(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  world.nukes = world.nukes.filter((n) => {
    n.fuse -= world.dt;
    if (n.fuse > 0) return true;
    events.push(...detonate(world, n));
    return false;
  });
  return events;
}

/** Map-wide falloff from `damage` at ground zero to `edgeDamage` at `radius`; flattens nearby buildings. */
export function detonate(world: World, n: Nuke): SimEvent[] {
  const events: SimEvent[] = [{ type: "nukeDetonate", pos: { ...n.pos } }, { type: "explode", pos: { ...n.pos }, radius: def.flattenRadius }];
  for (const t of world.tanks) {
    const k = Math.min(1, dist(t.pos, n.pos) / def.radius);
    const amount = def.damage + (def.edgeDamage - def.damage) * k;
    events.push(...applyDamage(world, { target: t, amount, sourceId: n.ownerId, from: n.pos, weapon: "nuke" }));
  }
  const c = world.map.cell;
  for (const s of world.structures) {
    if (dist({ x: (s.cx + 0.5) * c, y: (s.cy + 0.5) * c }, n.pos) <= def.flattenRadius) events.push(...damageStructure(s, s.maxHp, n.ownerId));
  }
  return events;
}
