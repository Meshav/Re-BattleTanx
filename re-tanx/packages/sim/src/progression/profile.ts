import type { World } from "../world.ts";
import type { TankKind } from "../data/tankDefs.ts";
import type { PerkId } from "./perks.ts";
import { perkIds } from "./perks.ts";
import { isUnlocked, levelFor, perkSlots, unlocksUpTo } from "./levels.ts";
import { gangIds, type GangId } from "../data/gangDefs.ts";
import { matchXp, type XpAward, type XpLine } from "./xp.ts";
import type { Rating } from "./glicko.ts";
import { advanceChallenges, type ChallengeState, type ChallengeStat } from "./challenges.ts";

/** Lifetime player record. Plain JSON: stored in the browser (guest) or on the server (online). */
export interface Profile {
  xp: number;
  title: string | undefined;
  perks: PerkId[];
  masteryKills: Partial<Record<TankKind, number>>;
  totals: { matches: number; wins: number; kills: number; deaths: number; structures: number; queens: number; missions: number };
  challenges: ChallengeState | undefined;
  lastWinDay: string | undefined;
  /** ranked online play (Glicko-2); absent until the first ranked match */
  rating?: Rating;
  /** name last used online, for leaderboards */
  name?: string;
}

export const newProfile = (): Profile => ({
  xp: 0, title: undefined, perks: [], masteryKills: {}, challenges: undefined, lastWinDay: undefined,
  totals: { matches: 0, wins: 0, kills: 0, deaths: 0, structures: 0, queens: 0, missions: 0 },
});

export interface MatchResult { profile: Profile; award: XpAward; levelBefore: number; levelAfter: number; unlocked: string[]; rating?: { before: number; after: number } }

/** Perks you may actually equip at your level (drops unknown ids and anything past your slot count). */
/** A gang the profile has unlocked, else the first starter gang. */
export const legalGang = (p: Pick<Profile, "xp">, wanted: GangId): GangId =>
  isUnlocked(levelFor(p.xp).level, `gang:${wanted}`) ? wanted : gangIds[0]!;

export const legalPerks = (p: Pick<Profile, "xp">, wanted: unknown): PerkId[] => {
  const list = Array.isArray(wanted) ? wanted.filter((x): x is PerkId => perkIds.includes(x as PerkId)) : [];
  return [...new Set(list)].slice(0, perkSlots(levelFor(p.xp).level));
};

/** Fold one finished match into a profile: XP (with challenges), mastery, totals, unlocks gained. */
export function applyMatch(prev: Profile, world: World, tankId: number, ctx: { botsOnly: boolean; day: string; grade?: string }): MatchResult {
  const p: Profile = JSON.parse(JSON.stringify(prev)) as Profile;
  const tank = world.tanks.find((t) => t.id === tankId);
  const s = world.stats[tankId];
  const won = !!tank && world.mode.winner === tank.team;
  const award = matchXp(world, tankId, { botsOnly: ctx.botsOnly, firstWinToday: won && p.lastWinDay !== ctx.day, ...(ctx.grade ? { grade: ctx.grade } : {}) });
  const mission = !!world.campaign && won;
  const gains: Partial<Record<ChallengeStat, number>> = {
    kills: s?.kills ?? 0, structures: s?.structures ?? 0, queens: s?.queens ?? 0, specials: s?.specials ?? 0, pickups: s?.pickups ?? 0,
    matches: 1, wins: won ? 1 : 0, missions: mission ? 1 : 0,
  };
  const ch = advanceChallenges(p.challenges, ctx.day, gains);
  const challengeLines: XpLine[] = ch.completed.map((c) => ({ label: `Challenge: ${c.label}`, xp: c.xp }));
  const lines = [...award.lines, ...challengeLines];
  const total = award.total + challengeLines.reduce((n, l) => n + l.xp, 0);
  const levelBefore = levelFor(p.xp).level;
  p.xp += total;
  p.challenges = ch.state;
  if (won) p.lastWinDay = ctx.day;
  for (const [k, n] of Object.entries(s?.killsByKind ?? {})) p.masteryKills[k as TankKind] = (p.masteryKills[k as TankKind] ?? 0) + (n ?? 0);
  const t = p.totals;
  Object.assign(t, { matches: t.matches + 1, wins: t.wins + (won ? 1 : 0), kills: t.kills + (s?.kills ?? 0), deaths: t.deaths + (s?.deaths ?? 0),
    structures: t.structures + (s?.structures ?? 0), queens: t.queens + (s?.queens ?? 0), missions: t.missions + (mission ? 1 : 0) });
  const levelAfter = levelFor(p.xp).level;
  const before = new Set(unlocksUpTo(levelBefore));
  return { profile: p, award: { lines, total }, levelBefore, levelAfter, unlocked: unlocksUpTo(levelAfter).filter((k) => !before.has(k)) };
}

/** Defensive load: anything malformed becomes a fresh profile field. */
export function sanitizeProfile(v: unknown): Profile {
  const base = newProfile();
  if (typeof v !== "object" || v === null) return base;
  const o = v as Partial<Profile>;
  const xp = typeof o.xp === "number" && Number.isFinite(o.xp) && o.xp >= 0 ? o.xp : 0;
  return {
    ...base, ...o, xp, perks: legalPerks({ xp }, o.perks),
    totals: { ...base.totals, ...(typeof o.totals === "object" ? o.totals : {}) },
    masteryKills: typeof o.masteryKills === "object" && o.masteryKills ? o.masteryKills : {},
    rating: goodRating(o.rating) ? o.rating : undefined,
  };
}

const goodRating = (r: unknown): r is Rating => {
  const x = r as Rating;
  return !!x && [x.r, x.rd, x.vol, x.games].every((n) => typeof n === "number" && Number.isFinite(n)) && x.rd > 0 && x.vol > 0;
};
