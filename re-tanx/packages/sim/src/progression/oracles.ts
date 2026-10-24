import { progressionDefs, tierFor, type LevelInfo } from "./levels.ts";
import type { Profile } from "./profile.ts";
import type { OracleLink } from "../entities/tank.ts";

/** Companions you take into a match (shown as names.queen, "Oracle"): a passive that grows with your bond, and a gift at bond 3. */
export type OracleId = keyof typeof progressionDefs.oracles;
export const oracleDefs = progressionDefs.oracles;
export const oracleIds = Object.keys(oracleDefs) as OracleId[];

const B = progressionDefs.bond;
export const maxBond = B.track.length;
export const bondXp = B.xp;

/** Bond 1–5 from bond XP earned in matches with her. */
export const bondFor = (xp: number): LevelInfo => tierFor(B.track, xp);

/** Unlocked by lifetime totals: campaign missions or a challenge (kills, structures…). */
export function oracleProgress(p: Pick<Profile, "totals">, id: OracleId): { have: number; need: number } {
  const u = oracleDefs[id].unlock;
  return { have: p.totals[u.stat as keyof Profile["totals"]] ?? 0, need: u.target };
}

export const oracleUnlocked = (p: Pick<Profile, "totals">, id: OracleId): boolean => {
  const { have, need } = oracleProgress(p, id);
  return have >= need;
};

/** The wanted Oracle if the profile has unlocked it, else none. */
export const legalOracle = (p: Pick<Profile, "totals">, wanted: unknown): OracleId | undefined =>
  oracleIds.includes(wanted as OracleId) && oracleUnlocked(p, wanted as OracleId) ? (wanted as OracleId) : undefined;

/** Most wingmen any mission has. */
export const MAX_WINGMEN = 3;

/** Oracles you send with your AI wingmen, first wingman first: unlocked, not the one riding with you, each once. */
export function wingmenOracles(p: Pick<Profile, "totals" | "bonds">, wanted: unknown, own: unknown): OracleLink[] {
  const mine = legalOracle(p, own);
  const ids: OracleId[] = [];
  for (const w of Array.isArray(wanted) ? wanted : []) {
    const id = legalOracle(p, w);
    if (id && id !== mine && !ids.includes(id)) ids.push(id);
  }
  return ids.slice(0, MAX_WINGMEN).map((id) => ({ id, bond: bondFor(p.bonds[id] ?? 0).level }));
}
