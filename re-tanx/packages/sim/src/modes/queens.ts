import type { World } from "../world.ts";
import type { Tank } from "../entities/tank.ts";
import type { Queen } from "../entities/queen.ts";
import type { SimEvent } from "../events.ts";
import type { Vec2 } from "../math/vec2.ts";
import { carriedBy } from "../entities/queen.ts";
import { queenDefs } from "../data/modeDefs.ts";
import { dist } from "../math/vec2.ts";

export function addQueen(world: World, team: number, home: Vec2): Queen {
  const q: Queen = { id: world.nextId++, team, pos: { ...home }, home: { ...home }, state: "home", carrierId: undefined, heldBy: undefined, droppedFor: 0 };
  world.queens.push(q);
  return q;
}

/** Living tanks close enough to grab her, that aren't already carrying someone. */
export const toucher = (world: World, q: Queen, accept: (t: Tank) => boolean): Tank | undefined =>
  world.tanks.find((t) => t.alive && dist(t.pos, q.pos) <= queenDefs.touchRadius && !carriedBy(world.queens, t.id) && accept(t));

export const fortressOf = (world: World, team: number): Vec2 | undefined => world.map.fortresses[team];

export function atOwnFortress(world: World, t: Tank): boolean {
  const f = fortressOf(world, t.team);
  return f !== undefined && dist(f, t.pos) <= queenDefs.fortressRadius;
}

export function take(q: Queen, t: Tank): SimEvent {
  q.state = "carried";
  q.carrierId = t.id;
  q.heldBy = undefined;
  return { type: "queen", what: "taken", queenId: q.id, team: t.team, pos: { ...q.pos } };
}

export function sendHome(q: Queen): SimEvent {
  Object.assign(q, { state: "home", carrierId: undefined, heldBy: undefined, droppedFor: 0, pos: { ...q.home } });
  return { type: "queen", what: "returned", queenId: q.id, team: q.team, pos: { ...q.pos } };
}

/** Carried queens ride along; if the carrier died she's dropped where it fell. */
export function followCarrier(world: World, q: Queen): SimEvent[] {
  if (q.state !== "carried") return [];
  const c = world.tanks.find((t) => t.id === q.carrierId);
  if (c?.alive) {
    q.pos = { ...c.pos };
    return [];
  }
  Object.assign(q, { state: "dropped", carrierId: undefined, droppedFor: 0 });
  return [{ type: "queen", what: "dropped", queenId: q.id, team: q.team, pos: { ...q.pos } }];
}

/** Dropped queens left alone too long go home (or respawn, for neutral queens). */
export function dropTimedOut(world: World, q: Queen, after: number): boolean {
  if (q.state !== "dropped") return false;
  q.droppedFor += world.dt;
  return q.droppedFor >= after;
}
