import type { World } from "../world.ts";
import type { Tank } from "../entities/tank.ts";
import type { SimEvent } from "../events.ts";

export type ModeKind = "deathmatch" | "annihilation" | "tankWars" | "family" | "battlelord" | "frenzy" | "holdEm" | "koth" | "horde" | "lastGang" | "siege" | "convoy" | "campaign";

export interface ModeConfig { kind: ModeKind; scoreLimit?: number; timeLimit?: number }

/** Match bookkeeping. `winner` is a team, or -1 for a draw. */
export interface ModeState {
  kind: ModeKind; scoreLimit: number; timeLimit: number; elapsed: number;
  scores: Record<number, number>; over: boolean; winner: number | undefined;
  /** Last Gang Standing: current round and the break before the next one */
  round?: number; nextRoundIn?: number;
  /** Siege: the defenders' core (kept here so snapshots carry it) */
  coreHp?: number; coreMax?: number;
  /** Convoy: who is escorting this round, trucks still on the road, seconds left in the round */
  convoy?: { protectors: number; trucksLeft: number; roundLeft: number };
}

/** Each mode overrides only what differs (doc 12 §12.8). */
export interface ModeRules {
  /** objective modes play one team per fortress on the map */
  usesFortresses?: boolean;
  /** fixed team count (Siege: defenders 0, attackers 1) */
  teamCount?: number;
  /** co-op modes put every slot on this team */
  allTeam?: number;
  /** incoming damage multiplier (Family Mode) */
  damageScale?: number;
  /** false = specials can't be switched, only used up (Family Mode) */
  allowCycle?: boolean;
  setup?(world: World): void;
  onTick?(world: World, events: SimEvent[]): SimEvent[];
  onKill(world: World, victim: Tank, killer: Tank | undefined): void;
  canRespawn(world: World, tank: Tank): boolean;
  checkWin(world: World): number | undefined;
}

export const teamsOf = (world: World): number[] => [...new Set(world.tanks.map((t) => t.team))];

/** Team with the most points; -1 if tied at the top. */
export function leader(scores: Record<number, number>, teams: number[]): number {
  const sorted = teams.map((t) => [t, scores[t] ?? 0] as const).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return -1;
  return sorted.length > 1 && sorted[0]![1] === sorted[1]![1] ? -1 : sorted[0]![0];
}

/** Enemy kill: +1 to the killer's team. Suicides and team kills cost a point. */
export function scoreKill(world: World, victim: Tank, killer: Tank | undefined): void {
  const s = world.mode.scores;
  if (!killer || killer.team === victim.team) {
    s[victim.team] = (s[victim.team] ?? 0) - 1;
    return;
  }
  s[killer.team] = (s[killer.team] ?? 0) + 1;
}

export const noScore = (): void => {};

/** Score limit reached, or time up → leader (or draw). */
export function limitWin(world: World): number | undefined {
  const { scores, scoreLimit, timeLimit, elapsed } = world.mode;
  const teams = teamsOf(world);
  const top = scoreLimit > 0 ? teams.find((t) => (scores[t] ?? 0) >= scoreLimit) : undefined;
  if (top !== undefined) return top;
  return timeLimit > 0 && elapsed >= timeLimit ? leader(scores, teams) : undefined;
}
