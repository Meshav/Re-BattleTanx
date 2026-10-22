import type { World } from "../world.ts";
import type { Tank } from "../entities/tank.ts";
import type { SimEvent } from "../events.ts";
import type { ModeRules } from "./mode.ts";
import type { Vec2 } from "../math/vec2.ts";
import { addTank } from "../world.ts";
import { modeDefs } from "../data/modeDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { findPath } from "../ai/nav/grid.ts";
import { headTo } from "../ai/steering.ts";
import { angleOf, dist, sub } from "../math/vec2.ts";
import { respawnTank } from "../systems/stepRespawn.ts";
import { idleInput } from "../input.ts";

const def = modeDefs.convoy;

/** Per round: the road, who escorts, and each truck's next waypoint. */
export interface ConvoyState {
  round: number; protectors: number; path: Vec2[]; trucks: number[]; waypoint: Record<number, number>; delivered: number[]; roundLeft: number;
  /** ticks a truck has been pushing without moving, and when its back-off ends */
  stuck: Record<number, number>; reverseUntil: Record<number, number>;
}

export const isTruck = (t: Tank): boolean => tankDefs[t.kind].class === "convoy";

/** Round 1: team 0 escorts from its fortress to team 1's. Round 2 swaps sides and direction. */
function startRound(world: World, round: number): void {
  const protectors = round === 1 ? 0 : 1;
  const [from, to] = [world.map.fortresses[protectors], world.map.fortresses[1 - protectors]];
  world.tanks = world.tanks.filter((t) => !isTruck(t));
  const path = from && to ? findPath(world, from, to) ?? [] : [];
  const c: ConvoyState = { round, protectors, path, trucks: [], waypoint: {}, delivered: world.convoy?.delivered ?? [0, 0], roundLeft: def.roundSeconds, stuck: {}, reverseUntil: {} };
  world.convoy = c;
  if (!from || !path.length) return;
  // line up on the road itself (never inside a wall): lead truck furthest along
  const step = Math.max(1, Math.round(def.spacing / world.map.cell));
  for (let i = 0; i < def.trucks; i++) {
    const at = Math.min(path.length - 2, (def.trucks - 1 - i) * step);
    const t = addTank(world, { team: protectors, kind: "truck", name: `Truck ${i + 1}` }, 0);
    t.pos = { ...path[Math.max(0, at)]! };
    t.rot = t.turretRot = angleOf(sub(path[Math.max(0, at) + 1]!, t.pos));
    c.trucks.push(t.id);
    c.waypoint[t.id] = Math.max(0, at) + 1;
  }
}

/** Trucks follow the road while a protector is near and the truck ahead isn't too close. */
function driveTrucks(world: World, c: ConvoyState): SimEvent[] {
  const events: SimEvent[] = [];
  const escorts = world.tanks.filter((t) => t.alive && t.team === c.protectors && !isTruck(t));
  let ahead: Tank | undefined;
  for (const id of c.trucks) {
    const t = world.tanks.find((k) => k.id === id);
    if (!t?.alive) continue;
    let wp = c.waypoint[id] ?? 0;
    while (wp < c.path.length - 1 && dist(c.path[wp]!, t.pos) < 4) wp++;
    c.waypoint[id] = wp;
    const goal = c.path[wp]!;
    if (wp === c.path.length - 1 && dist(goal, t.pos) <= def.deliverRange) {
      t.alive = false; // safely through: off the board
      c.delivered[c.protectors] = (c.delivered[c.protectors] ?? 0) + 1;
      events.push({ type: "convoy", what: "delivered", tankId: t.id, team: c.protectors });
      continue;
    }
    const escorted = escorts.some((e) => dist(e.pos, t.pos) <= def.escortRange);
    const crowded = ahead !== undefined && dist(ahead.pos, t.pos) < def.spacing * 0.7;
    const go = escorted && !crowded;
    world.inputs[t.id] = go ? { ...idleInput(t.turretRot), ...unstick(world, c, t, headTo(t, angleOf(sub(goal, t.pos)))) } : idleInput(t.turretRot);
    ahead = t;
  }
  return events;
}

/** Pushed into a wall by a tank? Back off and turn for a second, like bots do. */
function unstick(world: World, c: ConvoyState, t: Tank, drive: { throttle: number; steer: number }) {
  if (world.tick < (c.reverseUntil[t.id] ?? 0)) return { throttle: -1, steer: 0.7 };
  c.stuck[t.id] = drive.throttle > 0.5 && Math.abs(t.speed) < 0.5 ? (c.stuck[t.id] ?? 0) + 1 : 0;
  if (c.stuck[t.id]! > 2 / world.dt) {
    c.stuck[t.id] = 0;
    c.reverseUntil[t.id] = world.tick + Math.round(1 / world.dt);
  }
  return drive;
}

const trucksLeft = (world: World, c: ConvoyState) => c.trucks.filter((id) => world.tanks.find((t) => t.id === id)?.alive).length;

/**
 * Convoy (Global Assault): protectors escort three trucks along the road between the fortresses; attackers destroy them.
 * Trucks only roll with a protector within 25 m. Two rounds, sides swap; most trucks delivered wins.
 */
export const convoy: ModeRules = {
  usesFortresses: true,
  teamCount: 2,
  setup(world) {
    startRound(world, 1);
  },
  onTick(world) {
    const c = world.convoy;
    if (!c) return [];
    c.roundLeft -= world.dt;
    const events = driveTrucks(world, c);
    const left = trucksLeft(world, c);
    world.mode.scores = { 0: c.delivered[0] ?? 0, 1: c.delivered[1] ?? 0 };
    world.mode.round = c.round;
    world.mode.convoy = { protectors: c.protectors, trucksLeft: left, roundLeft: Math.max(0, Math.ceil(c.roundLeft)) };
    if (left > 0 && c.roundLeft > 0) return events;
    events.push({ type: "round", round: c.round, winner: c.protectors });
    if (c.round === 1) {
      startRound(world, 2);
      for (const t of world.tanks) if (!isTruck(t)) events.push(respawnTank(world, t)); // fresh start on the other side
    } else c.round = 3; // done: checkWin decides
    return events;
  },
  onKill() {},
  canRespawn: (_world, tank) => !isTruck(tank),
  checkWin(world) {
    const c = world.convoy;
    if (!c || c.round < 3) return undefined;
    const [a, b] = [c.delivered[0] ?? 0, c.delivered[1] ?? 0];
    return a === b ? -1 : a > b ? 0 : 1;
  },
};
