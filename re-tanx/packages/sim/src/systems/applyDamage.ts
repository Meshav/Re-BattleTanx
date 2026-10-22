import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import { maxHp, type Tank } from "../entities/tank.ts";
import { stageFor, type Structure } from "../entities/structure.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { rules } from "../data/rules.ts";
import { wrapAngle } from "../math/angle.ts";
import { angleOf, sub, type Vec2 } from "../math/vec2.ts";
import { dropLoot } from "../entities/pickup.ts";
import { modeRules } from "../modes/registry.ts";
import { perkMods } from "../progression/perks.ts";
import { railArmor } from "../modes/rail.ts";

/** `raw`: damage-over-time (burn) — no armor, no direction, no 1-point minimum. */
export interface DamageHit { target: Tank; amount: number; sourceId: number; from: Vec2; raw?: boolean }

/** Front/side/rear multiplier from where the shot came relative to the hull. */
export function directionalFactor(target: Tank, from: Vec2): number {
  const off = Math.abs(wrapAngle(angleOf(sub(from, target.pos)) - target.rot));
  if (off < Math.PI / 4) return rules.directional.front;
  if (off > (3 * Math.PI) / 4) return tankDefs[target.kind].rearMultiplier ?? rules.directional.rear;
  return rules.directional.side;
}

export function applyDamage(world: World, hit: DamageHit): SimEvent[] {
  const { target, sourceId } = hit;
  if (!target.alive) return [];
  const def = tankDefs[target.kind];
  const scale = (modeRules[world.mode.kind].damageScale ?? 1) * (def.damageTaken ?? 1) * perkMods(target).damageTaken * attackerFactor(world, sourceId) * railArmor(world, target);
  const armor = def.armor * perkMods(target).armor;
  const events: SimEvent[] = [];
  const base = hit.raw ? hit.amount * scale : Math.max(1, Math.round(hit.amount * directionalFactor(target, hit.from) * scale - armor));
  const amount = absorbShield(target, base, events);
  if (amount <= 0) return events;
  target.hp -= amount;
  events.push({ type: "hit", targetId: target.id, sourceId, amount, pos: { ...target.pos } });
  if (target.hp > 0) return events;
  target.hp = 0;
  target.alive = false;
  target.speed = 0;
  target.respawnIn = rules.respawnDelay;
  target.deaths++;
  dropLoot(world, target.pos, target.selected, target.selected ? target.specials[target.selected] ?? 0 : 0);
  target.specials = {};
  target.selected = undefined;
  target.shield = target.shieldTime = 0;
  const killer = world.tanks.find((t) => t.id === sourceId);
  if (killer && killer.id !== target.id && killer.team !== target.team) killer.kills++;
  events.push({ type: "kill", victimId: target.id, killerId: sourceId });
  events.push({ type: "explode", pos: { ...target.pos }, radius: 6 });
  return events;
}

/** Demolitionist hits tanks softer; Last Stand hits harder when nearly dead. */
function attackerFactor(world: World, sourceId: number): number {
  const src = world.tanks.find((t) => t.id === sourceId);
  if (!src) return 1;
  const m = perkMods(src);
  return m.tankDmg * (src.hp < maxHp(src) * 0.2 ? m.lowHpDmg : 1);
}

/** Damage a structure on someone's behalf (credits the collapse, applies Demolitionist). */
export function hitStructure(world: World, s: Structure, amount: number, by: number): SimEvent[] {
  const src = world.tanks.find((t) => t.id === by);
  return damageStructure(s, amount * perkMods(src).structureDmg, by);
}

/** Shield soaks damage first; returns what gets through. */
function absorbShield(target: Tank, amount: number, events: SimEvent[]): number {
  if (target.shield <= 0) return amount;
  const absorbed = Math.min(target.shield, amount);
  target.shield -= absorbed;
  if (target.shield <= 0) target.shieldTime = 0;
  events.push({ type: "shieldHit", tankId: target.id, absorbed });
  return amount - absorbed;
}

export function damageStructure(s: Structure, amount: number, by?: number): SimEvent[] {
  if (s.hp <= 0) return [];
  s.hp = Math.max(0, s.hp - amount);
  const stage = stageFor(s.hp, s.maxHp);
  if (stage === s.stage) return [];
  s.stage = stage;
  return [{ type: "structureStage", structureId: s.id, stage, ...(by !== undefined ? { by } : {}) }];
}
