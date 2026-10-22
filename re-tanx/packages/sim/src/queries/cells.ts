import type { World } from "../world.ts";
import type { Vec2 } from "../math/vec2.ts";
import { RUBBLE, type Structure } from "../entities/structure.ts";

export function structureAt(world: World, cx: number, cy: number): Structure | undefined {
  const { cols, rows } = world.map;
  if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return undefined;
  const idx = world.grid[cy * cols + cx] ?? -1;
  return idx < 0 ? undefined : world.structures[idx];
}

export function inBounds(world: World, cx: number, cy: number): boolean {
  return cx >= 0 && cy >= 0 && cx < world.map.cols && cy < world.map.rows;
}

/** Blocks movement and shots: out-of-bounds or a non-rubble structure. */
export function isSolidCell(world: World, cx: number, cy: number): boolean {
  if (!inBounds(world, cx, cy)) return true;
  const s = structureAt(world, cx, cy);
  return s !== undefined && s.stage < RUBBLE;
}

export const isWater = (world: World, cx: number, cy: number): boolean => world.map.water[cy * world.map.cols + cx] === true;

/** Movement blocking: walls for everyone, water for anything that doesn't hover. */
export const blocksTank = (world: World, cx: number, cy: number, hover: boolean): boolean =>
  isSolidCell(world, cx, cy) || (!hover && inBounds(world, cx, cy) && isWater(world, cx, cy));

export function cellOf(world: World, p: Vec2): { cx: number; cy: number } {
  return { cx: Math.floor(p.x / world.map.cell), cy: Math.floor(p.y / world.map.cell) };
}

export function isRubbleAt(world: World, p: Vec2): boolean {
  const { cx, cy } = cellOf(world, p);
  return structureAt(world, cx, cy)?.stage === RUBBLE;
}
