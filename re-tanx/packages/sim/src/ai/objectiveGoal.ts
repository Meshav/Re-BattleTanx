import type { World } from "../world.ts";
import type { Tank } from "../entities/tank.ts";
import type { Queen } from "../entities/queen.ts";
import type { Vec2 } from "../math/vec2.ts";
import { carriedBy } from "../entities/queen.ts";
import { dist } from "../math/vec2.ts";
import { DEFENDERS, siegeCore } from "../modes/siege.ts";
import { railOf } from "../modes/rail.ts";
import { isTruck } from "../modes/convoy.ts";
import { modeDefs } from "../data/modeDefs.ts";

export type Role = "attack" | "defend" | "roam";
export interface Goal { pos: Vec2; urgency: number; chaseId?: number; /** shoot the goal itself when nothing better is in sight */ shoot?: boolean }

/** Doc 06 §6.7 split: ~40% attack, ~40% defend, ~20% roam — stable per tank. */
export const roleOf = (tank: Tank): Role => (["attack", "attack", "defend", "defend", "roam"] as const)[tank.id % 5]!;

const carrierOf = (world: World, q: Queen) => world.tanks.find((t) => t.id === q.carrierId);

/** Where this tank should be for the objective, or undefined if nothing to do. */
export function objectiveGoal(world: World, tank: Tank): Goal | undefined {
  if (world.zone) return dist(world.zone.pos, tank.pos) > world.zone.radius * 0.6 ? { pos: world.zone.pos, urgency: roleOf(tank) === "roam" ? 0.5 : 0.8 } : undefined;
  if (world.mode.kind === "siege") return siegeGoal(world, tank);
  if (world.convoy) return convoyGoal(world, tank);
  if (!world.queens.length) return undefined;
  const mine = carriedBy(world.queens, tank.id);
  if (mine) return carrying(world, tank, mine);
  const chase = world.queens.find((q) => q.state === "carried" && carrierOf(world, q)!.team !== tank.team && (q.team === tank.team || q.team === -1));
  if (chase) return { pos: carrierOf(world, chase)!.pos, urgency: 1.0, chaseId: chase.carrierId };
  const neutral = nearest(tank, world.queens.filter((q) => q.team === -1 && q.state !== "carried"));
  if (neutral) return { pos: neutral.pos, urgency: 0.85 };
  return battlelordGoal(world, tank);
}

/** Doc 06 §6.7 Convoy: protectors stay with the trucks; attackers set up on the road ahead of the lead truck. */
function convoyGoal(world: World, tank: Tank): Goal | undefined {
  const c = world.convoy!;
  if (isTruck(tank)) return undefined;
  const trucks = c.trucks.map((id) => world.tanks.find((t) => t.id === id)).filter((t): t is Tank => !!t?.alive);
  if (!trucks.length) return undefined;
  if (tank.team === c.protectors) {
    const t = [...trucks].sort((a, b) => dist(a.pos, tank.pos) - dist(b.pos, tank.pos))[0]!;
    return dist(t.pos, tank.pos) > 12 ? { pos: t.pos, urgency: 0.75 } : undefined;
  }
  const lead = trucks[0]!;
  const ahead = c.path[Math.min(c.path.length - 1, (c.waypoint[lead.id] ?? 0) + 3)] ?? lead.pos;
  return roleOf(tank) === "roam" ? { pos: lead.pos, urgency: 0.65, chaseId: lead.id } : dist(ahead, tank.pos) > 10 ? { pos: ahead, urgency: 0.6 } : undefined;
}

function siegeGoal(world: World, tank: Tank): Goal | undefined {
  const core = siegeCore(world);
  if (!core || core.hp <= 0) return undefined;
  const pos = { x: (core.cx + 0.5) * world.map.cell, y: (core.cy + 0.5) * world.map.cell };
  if (tank.team !== DEFENDERS) return { pos, urgency: 0.8, shoot: true };
  return dist(pos, tank.pos) > modeDefs.siege.defendRadius ? { pos, urgency: 0.6 } : undefined;
}

function carrying(world: World, tank: Tank, q: Queen): Goal {
  const home = world.map.fortresses[tank.team];
  if (world.mode.kind !== "holdEm" && home) return { pos: home, urgency: 1.2 };
  // Hold 'Em: keep away — head for the spawn farthest from the nearest enemy
  const enemies = world.tanks.filter((t) => t.alive && t.team !== tank.team);
  const safest = [...world.map.spawns].sort((a, b) => minDist(enemies, b) - minDist(enemies, a))[0];
  return { pos: safest ?? q.pos, urgency: 1.2 };
}

function battlelordGoal(world: World, tank: Tank): Goal | undefined {
  const rescue = nearest(tank, world.queens.filter((q) => q.team === tank.team && (q.state === "held" || q.state === "dropped")));
  const steal = nearest(tank, world.queens.filter((q) => q.team !== tank.team && q.heldBy !== tank.team && q.state !== "carried"));
  const role = roleOf(tank);
  if (role === "attack") return steal ? { pos: steal.pos, urgency: 0.65 } : rescue && { pos: rescue.pos, urgency: 0.7 };
  if (role === "defend") {
    if (rescue) return { pos: rescue.pos, urgency: 0.75 };
    if (railOf(world, tank.id)) return undefined; // manning the gun: engage takes it from here
    const rail = world.rails.find((r) => r.team === tank.team && r.riderId === undefined);
    if (rail) return { pos: { x: (rail.a.x + rail.b.x) / 2, y: rail.a.y }, urgency: 0.6 };
    const home = world.map.fortresses[tank.team];
    return home && dist(home, tank.pos) > 18 ? { pos: home, urgency: 0.5 } : undefined;
  }
  return rescue ? { pos: rescue.pos, urgency: 0.6 } : undefined;
}

const minDist = (ts: Tank[], p: Vec2) => (ts.length ? Math.min(...ts.map((t) => dist(t.pos, p))) : 999);
const nearest = (tank: Tank, qs: Queen[]) => qs.sort((a, b) => dist(a.pos, tank.pos) - dist(b.pos, tank.pos))[0];
