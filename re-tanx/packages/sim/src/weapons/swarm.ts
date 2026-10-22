import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { deg, wrapAngle } from "../math/angle.ts";
import { add, angleOf, dist, fromAngle, scale, sub, type Vec2 } from "../math/vec2.ts";

const def = specialDefs.swarm;

/** Nearest living enemy of `from.team` inside the seek cone around `facing`. */
export function seekTarget(world: World, from: { team: number; pos: Vec2 }, facing: number, coneDeg = def.seekCone): number | undefined {
  let best: number | undefined, bestD = def.seekRange;
  for (const t of world.tanks) {
    if (!t.alive || t.team === from.team) continue;
    const d = dist(t.pos, from.pos);
    const off = Math.abs(wrapAngle(angleOf(sub(t.pos, from.pos)) - facing));
    if (d < bestD && off <= deg(coneDeg) / 2) { best = t.id; bestD = d; }
  }
  return best;
}

/** A fan of homing rockets; super empties the rack. */
export function fireSwarm(world: World, tank: Tank, isSuper: boolean): SimEvent[] {
  const n = isSuper ? def.super.perShot : def.perShot;
  const targetId = seekTarget(world, tank, tank.turretRot);
  const spread = deg(isSuper ? 120 : 40);
  for (let i = 0; i < n; i++) {
    const rot = tank.turretRot + (n === 1 ? 0 : -spread / 2 + (spread * i) / (n - 1));
    world.missiles.push({
      id: world.nextId++, ownerId: tank.id, team: tank.team, kind: "swarm",
      pos: add(tank.pos, scale(fromAngle(rot), tankDefs[tank.kind].radius + 0.8)), rot,
      speed: def.speed, turnRate: def.turnRate, fuel: def.fuel, targetId, damage: def.damage, splash: def.splash,
    });
  }
  return [{ type: "special", tankId: tank.id, kind: "swarm", super: isSuper, pos: { ...tank.pos } }];
}
