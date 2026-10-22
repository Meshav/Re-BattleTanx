import type { World } from "../world.ts";
import type { Tank } from "../entities/tank.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { clamp } from "../math/clamp.ts";
import { blocksTank } from "../queries/cells.ts";

/** Push a tank's circle out of any solid cell it overlaps (slide along walls). */
export function resolveWalls(world: World, tank: Tank): void {
  const r = tankDefs[tank.kind].radius;
  const hover = tankDefs[tank.kind].hover === true;
  const c = world.map.cell;
  const minCx = Math.floor((tank.pos.x - r) / c), maxCx = Math.floor((tank.pos.x + r) / c);
  const minCy = Math.floor((tank.pos.y - r) / c), maxCy = Math.floor((tank.pos.y + r) / c);
  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      if (blocksTank(world, cx, cy, hover)) pushOut(tank, r, { x0: cx * c, y0: cy * c, x1: (cx + 1) * c, y1: (cy + 1) * c });
    }
  }
}

interface Box { x0: number; y0: number; x1: number; y1: number }

function pushOut(tank: Tank, r: number, b: Box): void {
  const nx = clamp(tank.pos.x, b.x0, b.x1);
  const ny = clamp(tank.pos.y, b.y0, b.y1);
  const dx = tank.pos.x - nx, dy = tank.pos.y - ny;
  const d = Math.hypot(dx, dy);
  if (d >= r) return;
  if (d > 1e-6) {
    tank.pos.x = nx + (dx / d) * r;
    tank.pos.y = ny + (dy / d) * r;
    return;
  }
  // centre inside the box: leave by the shallowest side
  const exits = [tank.pos.x - b.x0 + r, b.x1 - tank.pos.x + r, tank.pos.y - b.y0 + r, b.y1 - tank.pos.y + r];
  const i = exits.indexOf(Math.min(...exits));
  if (i === 0) tank.pos.x = b.x0 - r;
  if (i === 1) tank.pos.x = b.x1 + r;
  if (i === 2) tank.pos.y = b.y0 - r;
  if (i === 3) tank.pos.y = b.y1 + r;
}
