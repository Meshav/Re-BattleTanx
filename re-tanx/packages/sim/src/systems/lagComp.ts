import type { World } from "../world.ts";
import type { Vec2 } from "../math/vec2.ts";

/** How far back the server will rewind for a shot (doc 09 §9.4): ~250 ms. Older views get clamped, so lag can't be abused. */
export const MAX_REWIND_TICKS = 8;

/**
 * Server-side lag compensation for instant-hit weapons. Each tick the server remembers where every tank was;
 * a shooter's input says which tick they were looking at (`view`), and their hitscan is resolved against that past.
 */
export interface LagComp {
  history: { tick: number; pos: Record<number, Vec2 | null> }[];
  /** shooter tank id → the server tick their screen showed when they pulled the trigger */
  view: Record<number, number>;
}

export const createLagComp = (): LagComp => ({ history: [], view: {} });

/** Call once per tick after movement, so history[t] is what clients are sent for tick t. */
export function recordHistory(world: World): void {
  const lc = world.lagComp;
  if (!lc) return;
  lc.history.push({ tick: world.tick, pos: Object.fromEntries(world.tanks.map((t) => [t.id, t.alive ? { ...t.pos } : null])) });
  if (lc.history.length > MAX_REWIND_TICKS + 1) lc.history.shift();
}

/** Clamp a claimed view tick (client-supplied) into the rewind range. */
export const clampView = (world: World, view: number): number => Math.max(world.tick - MAX_REWIND_TICKS, Math.min(world.tick, Math.round(view)));

/** Run a hitscan with every other tank moved back to where the shooter saw it, then put them back. */
export function withRewind<T>(world: World, shooterId: number, fn: () => T): T {
  const claimed = world.lagComp?.view[shooterId];
  const view = claimed === undefined ? undefined : clampView(world, claimed);
  const past = view === undefined ? undefined : world.lagComp!.history.find((h) => h.tick === view);
  if (!past || view === world.tick) return fn();
  const saved = new Map<number, Vec2>();
  for (const t of world.tanks) {
    if (t.id === shooterId || !t.alive || !(t.id in past.pos)) continue;
    saved.set(t.id, t.pos);
    t.pos = past.pos[t.id] ?? { x: -1e6, y: -1e6 }; // not on the field back then: can't be hit
  }
  try {
    return fn();
  } finally {
    for (const t of world.tanks) {
      const p = saved.get(t.id);
      if (p) t.pos = p;
    }
  }
}
