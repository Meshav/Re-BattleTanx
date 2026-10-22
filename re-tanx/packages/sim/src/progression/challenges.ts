import { progressionDefs } from "./levels.ts";
import type { MatchStats } from "./stats.ts";

export type ChallengeStat = keyof Pick<MatchStats, "kills" | "structures" | "queens" | "specials" | "pickups"> | "matches" | "wins" | "missions";
export interface ChallengeDef { id: string; label: string; stat: ChallengeStat; target: number; xp: number }
export interface ChallengeState { day: string; ids: string[]; progress: Record<string, number>; claimed: string[] }

const pool = progressionDefs.challenges.pool as ChallengeDef[];
export const challengeDef = (id: string): ChallengeDef | undefined => pool.find((c) => c.id === id);

/** Same three challenges for everyone on a given UTC day. */
export function dailyChallenges(day: string): string[] {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const ids = pool.map((c) => c.id);
  const out: string[] = [];
  const want = Math.min(progressionDefs.challenges.perDay, ids.length);
  for (let tries = 0; out.length < want && tries < 1000; tries++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0; // imul: plain * loses the low bits past 2^53
    const id = ids[(h >>> 16) % ids.length]!;
    if (!out.includes(id)) out.push(id);
  }
  for (const id of ids) if (out.length < want && !out.includes(id)) out.push(id);
  return out;
}

export const today = (now = new Date()): string => now.toISOString().slice(0, 10);

/** Roll over to today's set if needed, add this match's numbers, return newly completed challenges. */
export function advanceChallenges(state: ChallengeState | undefined, day: string, gains: Partial<Record<ChallengeStat, number>>): { state: ChallengeState; completed: ChallengeDef[] } {
  const s: ChallengeState = state?.day === day ? (JSON.parse(JSON.stringify(state)) as ChallengeState) : { day, ids: dailyChallenges(day), progress: {}, claimed: [] };
  const completed: ChallengeDef[] = [];
  for (const id of s.ids) {
    const def = challengeDef(id);
    if (!def || s.claimed.includes(id)) continue;
    s.progress[id] = (s.progress[id] ?? 0) + (gains[def.stat] ?? 0);
    if (s.progress[id]! < def.target) continue;
    s.claimed.push(id);
    completed.push(def);
  }
  return { state: s, completed };
}
