import type { Vec2 } from "../math/vec2.ts";
import type { PickupKind } from "../data/pickupDefs.ts";
import { randomSpecials, type SpecialKind } from "../data/specialDefs.ts";
import { pickupDefs } from "../data/pickupDefs.ts";
import type { MapPickup } from "../data/map.ts";
import type { World } from "../world.ts";
import { pick } from "../math/rng.ts";

/**
 * Fixed pickups sit on map spots and respawn; dropped ones (star, loot) expire.
 * `random` spots roll a new special each respawn.
 */
export interface Pickup {
  id: number; kind: PickupKind; pos: Vec2;
  active: boolean; respawnIn: number;
  fixed: boolean; random: boolean; life: number;
  /** loot: which special and how many */
  special?: SpecialKind; amount?: number;
  /** cache: index of the structure it's buried under */
  under?: number;
}

export function mapPickup(world: World, p: MapPickup): Pickup {
  const kind = p.random ? pick(world.rng, randomSpecials) : p.kind;
  const under = p.hidden ? world.grid[Math.floor(p.pos.y / world.map.cell) * world.map.cols + Math.floor(p.pos.x / world.map.cell)] : undefined;
  return {
    id: world.nextId++, kind, pos: { ...p.pos }, active: !p.hidden, respawnIn: p.hidden ? Infinity : 0,
    fixed: !p.hidden && kind !== "bucks", random: p.random, life: Infinity, ...(under !== undefined && under >= 0 ? { under } : {}),
  };
}

/** On death: a Star, plus the victim's selected special stack as loot. */
export function dropLoot(world: World, pos: Vec2, special: SpecialKind | undefined, amount: number): void {
  const life = pickupDefs.star.life;
  world.pickups.push({ id: world.nextId++, kind: "star", pos: { ...pos }, active: true, respawnIn: 0, fixed: false, random: false, life });
  if (!special || amount <= 0) return;
  const offset = { x: pos.x + 3, y: pos.y };
  world.pickups.push({ id: world.nextId++, kind: "loot", pos: offset, active: true, respawnIn: 0, fixed: false, random: false, life, special, amount });
}
