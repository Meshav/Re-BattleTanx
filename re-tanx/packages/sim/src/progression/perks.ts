import raw from "../../../../data/progression.json";
import type { Tank } from "../entities/tank.ts";

export type PerkId = keyof typeof raw.perks;
export const perkDefs = raw.perks;
export const perkIds = Object.keys(raw.perks) as PerkId[];

/** Every knob a perk can turn. Multipliers default to 1, `starBonus` is additive. */
export interface PerkMods {
  maxHp: number; speed: number; ram: number; fireRate: number; specialMax: number; healthPickup: number; shieldPickup: number;
  hearing: number; armor: number; structureDmg: number; tankDmg: number; lowHpDmg: number; damageTaken: number; carrySpeed: number;
  starBonus: number;
}

const NEUTRAL: PerkMods = {
  maxHp: 1, speed: 1, ram: 1, fireRate: 1, specialMax: 1, healthPickup: 1, shieldPickup: 1,
  hearing: 1, armor: 1, structureDmg: 1, tankDmg: 1, lowHpDmg: 1, damageTaken: 1, carrySpeed: 1, starBonus: 0,
};

/** Combined effect of a tank's perks (empty list = no change). */
export function perkMods(tank: Pick<Tank, "perks"> | undefined): PerkMods {
  const out = { ...NEUTRAL };
  for (const id of tank?.perks ?? []) {
    for (const [k, v] of Object.entries(perkDefs[id].mods) as [keyof PerkMods, number][]) out[k] = k === "starBonus" ? out[k] + v : out[k] * v;
  }
  return out;
}
