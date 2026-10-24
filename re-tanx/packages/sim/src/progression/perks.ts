import raw from "../../../../data/progression.json";
import type { Tank } from "../entities/tank.ts";
import type { Profile } from "./profile.ts";
import { isUnlocked, levelFor, masteryLevel, perkSlots, tierFor, type LevelInfo } from "./levels.ts";
import { maxBond, oracleDefs } from "./oracles.ts";

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

/** What a tank's loadout can carry. Everything but perks is optional (bots, Arcade and snapshot mirrors have none). */
export type ModSource = Pick<Tank, "perks"> & Partial<Pick<Tank, "pros" | "kind" | "mastery" | "oracle">>;

/** Combined effect of a tank's perks (+PRO), its rank upgrades for the tank it's driving, and its Oracle (scaled by bond). */
export function perkMods(tank: ModSource | undefined): PerkMods {
  const out = { ...NEUTRAL };
  const add = (mods: Partial<PerkMods>, k = 1) => {
    for (const [key, v] of Object.entries(mods) as [keyof PerkMods, number][]) out[key] = key === "starBonus" ? out[key] + v * k : out[key] * (1 + (v - 1) * k);
  };
  for (const id of tank?.perks ?? []) {
    add(perkDefs[id].mods);
    if (tank?.pros?.includes(id)) add(perkDefs[id].pro.mods);
  }
  if (tank?.mastery && tank.kind) {
    const rank = masteryLevel(tank.mastery[tank.kind] ?? 0);
    for (const u of raw.tankUpgrades) if (rank >= u.rank) add(u.mods);
  }
  if (tank?.oracle) add(oracleDefs[tank.oracle.id].mods, tank.oracle.bond / maxBond);
  return out;
}

/** Perk level I–III, then IV = PRO, along its PRO challenge (counted in matches with the perk equipped). */
export function perkLevel(id: PerkId, progress: number): LevelInfo {
  const t = perkDefs[id].pro.target;
  return tierFor([0, Math.ceil(t / 3), Math.ceil((2 * t) / 3), t], progress);
}

/** Perks you may actually equip: unlocked at your level, no unknown ids or repeats, nothing past your slot count. */
export const legalPerks = (p: Pick<Profile, "xp">, wanted: unknown): PerkId[] => {
  const level = levelFor(p.xp).level;
  const list = Array.isArray(wanted) ? wanted.filter((x): x is PerkId => perkIds.includes(x as PerkId) && isUnlocked(level, `perk:${x}`)) : [];
  return [...new Set(list)].slice(0, perkSlots(level));
};

export const isPro = (p: Pick<Profile, "perkProgress">, id: PerkId): boolean => (p.perkProgress[id] ?? 0) >= perkDefs[id].pro.target;
