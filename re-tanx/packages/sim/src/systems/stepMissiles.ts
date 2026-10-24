import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Missile } from "../entities/missile.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { deg, turnToward, wrapAngle } from "../math/angle.ts";
import { angleOf, dist, sub } from "../math/vec2.ts";
import { clamp } from "../math/clamp.ts";
import { cellOf, isSolidCell, structureAt } from "../queries/cells.ts";
import { applySplash } from "./applySplash.ts";
import { seekTarget } from "../weapons/swarm.ts";
import { turretAt } from "../queries/raycast.ts";

/** Guided missiles follow their owner's steer input; swarm rockets home on their target. */
export function stepMissiles(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  world.missiles = world.missiles.filter((m) => {
    steer(world, m);
    m.fuel -= world.dt;
    m.pos.x += Math.cos(m.rot) * m.speed * world.dt;
    m.pos.y += Math.sin(m.rot) * m.speed * world.dt;
    const hitTank = world.tanks.find((t) => t.alive && t.team !== m.team && dist(t.pos, m.pos) <= tankDefs[t.kind].radius);
    const { cx, cy } = cellOf(world, m.pos);
    const wall = isSolidCell(world, cx, cy) || turretAt(world, m.pos, m.team) !== undefined;
    if (!hitTank && !wall && m.fuel > 0) return true;
    events.push(...applySplash(world, {
      pos: m.pos, radius: m.splash, damage: m.damage, sourceId: m.ownerId,
      direct: hitTank, directStructure: wall ? structureAt(world, cx, cy) : undefined, weapon: m.kind === "rocket" ? undefined : m.kind,
    }));
    return false;
  });
  return events;
}

function steer(world: World, m: Missile): void {
  const maxTurn = deg(m.turnRate) * world.dt;
  if (m.kind === "guided") {
    const input = world.inputs[m.ownerId];
    m.rot = wrapAngle(m.rot + clamp(input?.steer ?? 0, -1, 1) * maxTurn);
    return;
  }
  let target = world.tanks.find((t) => t.id === m.targetId && t.alive);
  if (!target) {
    m.targetId = seekTarget(world, m, m.rot); // launched blind or target died: keep looking
    target = world.tanks.find((t) => t.id === m.targetId);
  }
  if (target) m.rot = turnToward(m.rot, angleOf(sub(target.pos, m.pos)), maxTurn);
}
