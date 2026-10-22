import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import { addSpecial } from "../entities/tank.ts";
import type { Pickup } from "../entities/pickup.ts";
import { pickupDefs } from "../data/pickupDefs.ts";
import { randomSpecials, specialDefs, type SpecialKind } from "../data/specialDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { dist } from "../math/vec2.ts";
import { pick } from "../math/rng.ts";
import { RUBBLE } from "../entities/structure.ts";
import { maxHp } from "../entities/tank.ts";
import { perkMods } from "../progression/perks.ts";

/** Collect, respawn fixed pickups, expire drops, and tick shields down. */
export function stepPickups(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  for (const t of world.tanks) tickShield(t, world.dt);
  world.pickups = world.pickups.filter((p) => {
    if (p.under !== undefined) revealCache(world, p);
    if (!p.active) return respawnTick(world, p);
    p.life -= world.dt;
    if (p.life <= 0) return false;
    const taker = world.tanks.find((t) => t.alive && tankDefs[t.kind].class !== "convoy" && dist(t.pos, p.pos) <= pickupDefs.radius + tankDefs[t.kind].radius && apply(world, t, p));
    if (!taker) return true;
    events.push({ type: "pickup", tankId: taker.id, kind: p.kind, pos: { ...p.pos } });
    if (!p.fixed) return false;
    p.active = false;
    p.respawnIn = pickupDefs[p.kind].respawn;
    return true;
  });
  return events;
}

/** A buried cache appears once the building over it is rubble. */
function revealCache(world: World, p: Pickup): void {
  if (world.structures[p.under!]?.stage !== RUBBLE) return;
  p.active = true;
  p.respawnIn = 0;
  delete p.under;
}

function respawnTick(world: World, p: Pickup): boolean {
  p.respawnIn -= world.dt;
  if (p.respawnIn > 0) return true;
  p.active = true;
  if (p.random) p.kind = pick(world.rng, randomSpecials);
  return true;
}

function tickShield(t: Tank, dt: number): void {
  if (t.shieldTime <= 0) return;
  t.shieldTime -= dt;
  if (t.shieldTime <= 0) t.shield = 0;
}

/** Apply the effect; false means the tank can't use it (full), so the pickup stays. */
function apply(world: World, t: Tank, p: Pickup): boolean {
  const max = maxHp(t);
  const m = perkMods(t);
  switch (p.kind) {
    case "star": {
      t.hp = Math.min(max, t.hp + pickupDefs.star.heal);
      if (t.selected) addSpecial(t, t.selected, 1 + m.starBonus);
      return true;
    }
    case "health": {
      if (t.hp < max) {
        t.hp = Math.min(max, t.hp + pickupDefs.health.heal * m.healthPickup);
        return true;
      }
      return addSpecial(t, "health", 1) > 0; // stored for later (original behaviour)
    }
    case "shield":
      t.shield = pickupDefs.shield.absorb * m.shieldPickup;
      t.shieldTime = pickupDefs.shield.duration;
      return true;
    case "ammo":
      return t.selected !== undefined && addSpecial(t, t.selected, specialDefs[t.selected].max) > 0;
    case "bucks":
      if (!world.campaign) return false;
      world.campaign.bucks += pickupDefs.bucks.amount;
      world.campaign.cachesFound++;
      return true;
    case "loot":
      return p.special !== undefined && addSpecial(t, p.special, p.amount ?? 1) > 0;
    default:
      return addSpecial(t, p.kind as SpecialKind, pickupDefs[p.kind].amount) > 0;
  }
}
