import type { World } from "../world.ts";
import type { TankKind } from "../data/tankDefs.ts";
import type { SpecialKind } from "../data/specialDefs.ts";
import { legalPerks, type PerkId } from "./perks.ts";
import { isUnlocked, levelFor, unlocksUpTo } from "./levels.ts";
import { legalOracle, wingmenOracles, type OracleId } from "./oracles.ts";
import { foldLoadout } from "./loadout.ts";
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
  /** per special, from uses and kills: drives weapon levels */
  weaponXp: Partial<Record<SpecialKind, number>>;
  /** PRO challenge progress per perk (counted while equipped) */
  perkProgress: Partial<Record<PerkId, number>>;
  /** Oracle you take into matches, and bond XP with each */
  oracle: OracleId | undefined;
  bonds: Partial<Record<OracleId, number>>;
  /** Oracles assigned to AI wingmen (campaign and other missions with allies), first wingman first */
  wingmen: OracleId[];
  totals: { matches: number; wins: number; kills: number; deaths: number; structures: number; queens: number; missions: number };
  challenges: ChallengeState | undefined;
  lastWinDay: string | undefined;
  /** ranked online play (Glicko-2); absent until the first ranked match */
  rating?: Rating;
  /** name last used online, for leaderboards */
  name?: string;
}

export const newProfile = (): Profile => ({
  xp: 0, title: undefined, perks: [], masteryKills: {}, weaponXp: {}, perkProgress: {}, oracle: undefined, bonds: {}, wingmen: [], challenges: undefined, lastWinDay: undefined,
  totals: { matches: 0, wins: 0, kills: 0, deaths: 0, structures: 0, queens: 0, missions: 0 },
});

export interface MatchResult { profile: Profile; award: XpAward; levelBefore: number; levelAfter: number; unlocked: string[]; rating?: { before: number; after: number } }

export { legalPerks };

/** A gang the profile has unlocked, else the first starter gang. */
export const legalGang = (p: Pick<Profile, "xp">, wanted: GangId): GangId =>
  isUnlocked(levelFor(p.xp).level, `gang:${wanted}`) ? wanted : gangIds[0]!;

/** Fold one finished match into a profile: XP (with challenges), mastery, weapon XP, totals, PRO / bond progress, unlocks gained. */
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
  for (const [k, n] of Object.entries(s?.weaponXp ?? {})) p.weaponXp[k as SpecialKind] = (p.weaponXp[k as SpecialKind] ?? 0) + (n ?? 0);
  const t = p.totals;
  Object.assign(t, { matches: t.matches + 1, wins: t.wins + (won ? 1 : 0), kills: t.kills + (s?.kills ?? 0), deaths: t.deaths + (s?.deaths ?? 0),
    structures: t.structures + (s?.structures ?? 0), queens: t.queens + (s?.queens ?? 0), missions: t.missions + (mission ? 1 : 0) });
  const levelAfter = levelFor(p.xp).level;
  const before = new Set(unlocksUpTo(levelBefore));
  const unlocked = [...unlocksUpTo(levelAfter).filter((k) => !before.has(k)), ...foldLoadout(prev, p, world, tank, gains)];
  return { profile: p, award: { lines, total }, levelBefore, levelAfter, unlocked };
}

/** Defensive load: anything malformed becomes a fresh profile field. */
export function sanitizeProfile(v: unknown): Profile {
  const base = newProfile();
  if (typeof v !== "object" || v === null) return base;
  const o = v as Partial<Profile>;
  const xp = typeof o.xp === "number" && Number.isFinite(o.xp) && o.xp >= 0 ? o.xp : 0;
  const obj = <T>(x: T | undefined): T => (typeof x === "object" && x ? x : ({} as T));
  const totals = { ...base.totals, ...obj(o.totals) };
  return {
    ...base, ...o, xp, perks: legalPerks({ xp }, o.perks), totals,
    masteryKills: obj(o.masteryKills), weaponXp: obj(o.weaponXp), perkProgress: obj(o.perkProgress), bonds: obj(o.bonds),
    oracle: legalOracle({ totals }, o.oracle),
    wingmen: wingmenOracles({ totals, bonds: obj(o.bonds) }, o.wingmen, o.oracle).map((w) => w.id),
    rating: goodRating(o.rating) ? o.rating : undefined,
  };
}

const goodRating = (r: unknown): r is Rating => {
  const x = r as Rating;
  return !!x && [x.r, x.rd, x.vol, x.games].every((n) => typeof n === "number" && Number.isFinite(n)) && x.rd > 0 && x.vol > 0;
};
