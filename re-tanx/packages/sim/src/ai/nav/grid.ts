import type { World } from "../../world.ts";
import type { Vec2 } from "../../math/vec2.ts";
import { blocksTank, isSolidCell, structureAt } from "../../queries/cells.ts";
import { RUBBLE } from "../../entities/structure.ts";

interface Cell { cx: number; cy: number }

const RUBBLE_COST = 1.5;
const WALL_HUG_COST = 0.4; // keeps paths in the middle of streets
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

function stepCost(world: World, cx: number, cy: number): number {
  let cost = structureAt(world, cx, cy)?.stage === RUBBLE ? RUBBLE_COST : 1;
  for (const [dx, dy] of DIRS) if (isSolidCell(world, cx + dx, cy + dy)) cost += WALL_HUG_COST / 4;
  return cost;
}

/**
 * A* over map cells (8-way, no corner cutting). Reads live structure state,
 * so rubble opens new routes as soon as a building falls.
 * Returns cell-centre waypoints excluding the start cell, or undefined if unreachable.
 */
export function findPath(world: World, from: Vec2, to: Vec2, hover = false): Vec2[] | undefined {
  const blocked = (cx: number, cy: number) => blocksTank(world, cx, cy, hover);
  const { cols, cell } = world.map;
  const start = { cx: Math.floor(from.x / cell), cy: Math.floor(from.y / cell) };
  const goal = nearestOpen(blocked, { cx: Math.floor(to.x / cell), cy: Math.floor(to.y / cell) });
  if (!goal) return undefined;
  const key = (c: Cell) => c.cy * cols + c.cx;
  const h = (c: Cell) => Math.hypot(c.cx - goal.cx, c.cy - goal.cy);
  const g = new Map<number, number>([[key(start), 0]]);
  const came = new Map<number, Cell>();
  const open: { c: Cell; f: number }[] = [{ c: start, f: h(start) }];
  const closed = new Set<number>();
  while (open.length) {
    open.sort((a, b) => a.f - b.f); // shortcut: sorted array as the open set; fine for ~500-cell maps, use a heap if maps grow
    const { c } = open.shift()!;
    if (c.cx === goal.cx && c.cy === goal.cy) return rebuild(came, c, start, cell, key);
    const k = key(c);
    if (closed.has(k)) continue;
    closed.add(k);
    for (const [dx, dy] of DIRS) {
      const n = { cx: c.cx + dx, cy: c.cy + dy };
      if (blocked(n.cx, n.cy) || closed.has(key(n))) continue;
      if (dx && dy && (blocked(c.cx + dx, c.cy) || blocked(c.cx, c.cy + dy))) continue;
      const cost = (g.get(k) ?? 0) + stepCost(world, n.cx, n.cy) * (dx && dy ? Math.SQRT2 : 1);
      if (cost >= (g.get(key(n)) ?? Infinity)) continue;
      g.set(key(n), cost);
      came.set(key(n), c);
      open.push({ c: n, f: cost + h(n) });
    }
  }
  return undefined;
}

/** The goal cell, or the closest open cell within two rings of it (goals can land inside buildings). */
function nearestOpen(blocked: (cx: number, cy: number) => boolean, c: Cell): Cell | undefined {
  if (!blocked(c.cx, c.cy)) return c;
  for (let r = 1; r <= 2; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && !blocked(c.cx + dx, c.cy + dy)) return { cx: c.cx + dx, cy: c.cy + dy };
      }
    }
  }
  return undefined;
}

function rebuild(came: Map<number, Cell>, end: Cell, start: Cell, size: number, key: (c: Cell) => number): Vec2[] {
  const out: Vec2[] = [];
  for (let c: Cell | undefined = end; c && !(c.cx === start.cx && c.cy === start.cy); c = came.get(key(c))) {
    out.push({ x: (c.cx + 0.5) * size, y: (c.cy + 0.5) * size });
  }
  return out.reverse();
}

/** Random open road cell centre, for roaming. */
export function randomOpenPoint(world: World, roll: () => number): Vec2 {
  const { cols, rows, cell } = world.map;
  for (let i = 0; i < 50; i++) {
    const cx = Math.floor(roll() * cols), cy = Math.floor(roll() * rows);
    if (!blocksTank(world, cx, cy, false)) return { x: (cx + 0.5) * cell, y: (cy + 0.5) * cell };
  }
  return world.map.spawns[0] ?? { x: cell / 2, y: cell / 2 };
}
