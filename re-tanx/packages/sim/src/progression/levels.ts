import raw from "../../../../data/progression.json";

export const progressionDefs = raw;

/** XP needed to go from `level` to `level + 1` (doc 07: 500 + 150 × L). */
export const xpToNext = (level: number): number => raw.curve.base + raw.curve.perLevel * level;

export interface LevelInfo { level: number; into: number; next: number }

/** Level from lifetime XP, capped at maxLevel. */
export function levelFor(totalXp: number): LevelInfo {
  let level = 1, left = Math.max(0, totalXp);
  while (level < raw.maxLevel && left >= xpToNext(level)) {
    left -= xpToNext(level);
    level++;
  }
  return { level, into: left, next: level >= raw.maxLevel ? 0 : xpToNext(level) };
}

/** Everything unlocked at or below this level ("gang:x", "tank:x", "perkSlot", "title:x"). */
export function unlocksUpTo(level: number): string[] {
  return Object.entries(raw.unlocks).filter(([l]) => Number(l) <= level).flatMap(([, keys]) => keys);
}

export const unlocksAt = (level: number): string[] => (raw.unlocks as Record<string, string[]>)[String(level)] ?? [];
export const perkSlots = (level: number): number => unlocksUpTo(level).filter((k) => k === "perkSlot").length;
export const isUnlocked = (level: number, key: string): boolean => unlocksUpTo(level).includes(key);

/** Position on a threshold track (mastery, weapons): `into` counted past this tier, `next` needed for the next one (0 = maxed). */
export function tierFor(track: number[], n: number): LevelInfo {
  const level = track.filter((need) => n >= need).length;
  const lo = track[level - 1] ?? 0, hi = track[level];
  return { level, into: n - lo, next: hi === undefined ? 0 : hi - lo };
}

/** Tank mastery 1–10 from kills made in that tank (cosmetic only). */
export const masteryLevel = (kills: number): number => tierFor(raw.mastery, kills).level;

/** Weapon level V1–V5 from that special's XP (uses + kills, see `weaponXp`). */
export const weaponLevel = (xp: number): number => tierFor(raw.weaponLevels, xp).level;

/** Strength at a weapon level (V1 = ×1): damage for attack specials; heal, duration or reach for utility ones. Upgrades on only (not Arcade). */
export const weaponPower = (level: number): number => 1 + (level - 1) * raw.weaponPowerPerLevel;
