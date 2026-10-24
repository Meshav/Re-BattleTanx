import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { dist } from "../math/vec2.ts";
import { applyDamage } from "../systems/applyDamage.ts";
import { resolveWalls } from "../systems/resolveWalls.ts";

/** Radial blast that shoves enemies away; the Edge version also stuns them. */
export function shockwave(world: World, tank: Tank, kind: "shock" | "edge"): SimEvent[] {
  const def = specialDefs[kind];
  const events: SimEvent[] = [
    { type: "special", tankId: tank.id, kind, super: false, pos: { ...tank.pos } },
    { type: "explode", pos: { ...tank.pos }, radius: def.radius * 0.6 },
  ];
  for (const t of world.tanks) {
    const d = dist(t.pos, tank.pos);
    if (!t.alive || t.team === tank.team || d > def.radius) continue;
    const k = 1 - d / def.radius;
    events.push(...applyDamage(world, { target: t, amount: def.damage * (0.5 + k / 2), sourceId: tank.id, from: tank.pos, weapon: kind }));
    const push = def.knockback * k;
    t.pos.x += ((t.pos.x - tank.pos.x) / (d || 1)) * push;
    t.pos.y += ((t.pos.y - tank.pos.y) / (d || 1)) * push;
    t.speed = 0;
    resolveWalls(world, t);
    if ("stun" in def) t.fx.stun = def.stun;
  }
  return events;
}
