import type { World } from "../world.ts";
import { add, dist, fromAngle, scale, type Vec2 } from "../math/vec2.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { cellOf, isSolidCell, structureAt } from "./cells.ts";
import type { Tank } from "../entities/tank.ts";
import type { Structure } from "../entities/structure.ts";
import { TURRET_RADIUS, type Turret } from "../entities/turret.ts";

export type RayHit =
  | { kind: "tank"; tank: Tank; pos: Vec2 }
  | { kind: "turret"; turret: Turret; pos: Vec2 }
  | { kind: "structure"; structure: Structure | undefined; pos: Vec2 }
  | { kind: "none"; pos: Vec2 };

const STEP = 0.5; // shortcut: fixed-step march, fine at tank scale; swap for DDA if rays get long

export const tankAt = (world: World, p: Vec2, ignoreId: number): Tank | undefined =>
  world.tanks.find((t) => t.alive && t.id !== ignoreId && dist(t.pos, p) <= tankDefs[t.kind].radius);

export const turretAt = (world: World, p: Vec2, ignoreTeam: number): Turret | undefined =>
  world.turrets.find((t) => t.team !== ignoreTeam && dist(t.pos, p) <= TURRET_RADIUS);

/** March from `from` along `angle` up to `range`; first tank / enemy turret / solid cell wins. `wallsOnly` sees through tanks. */
export function raycast(world: World, from: Vec2, angle: number, range: number, ignoreId: number, wallsOnly = false): RayHit {
  const dir = fromAngle(angle);
  const team = world.tanks.find((t) => t.id === ignoreId)?.team ?? -1;
  for (let d = 0; d <= range; d += STEP) {
    const p = add(from, scale(dir, d));
    const tank = wallsOnly ? undefined : tankAt(world, p, ignoreId);
    if (tank) return { kind: "tank", tank, pos: p };
    const turret = wallsOnly ? undefined : turretAt(world, p, team);
    if (turret) return { kind: "turret", turret, pos: p };
    const { cx, cy } = cellOf(world, p);
    if (isSolidCell(world, cx, cy)) return { kind: "structure", structure: structureAt(world, cx, cy), pos: p };
  }
  return { kind: "none", pos: add(from, scale(dir, range)) };
}

/** True when nothing solid sits between a and b (tanks don't block). */
export function hasLineOfSight(world: World, a: Vec2, b: Vec2): boolean {
  const d = dist(a, b);
  const dir = scale({ x: b.x - a.x, y: b.y - a.y }, 1 / (d || 1));
  for (let s = 0; s < d; s += STEP) {
    const { cx, cy } = cellOf(world, add(a, scale(dir, s)));
    if (isSolidCell(world, cx, cy)) return false;
  }
  return true;
}
