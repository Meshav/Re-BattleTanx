import type { World } from "../world.ts";
import { progressionDefs } from "./levels.ts";

const X = progressionDefs.xp;

export interface XpLine { label: string; xp: number }
export interface XpAward { lines: XpLine[]; total: number }

export interface AwardContext {
  /** no other humans in the match (doc 07: bot-only matches pay half) */
  botsOnly: boolean;
  firstWinToday: boolean;
  /** campaign grade, when this was a mission */
  grade?: string;
}

/** XP for one human tank at the end of a match. Pure: same answer on the server and in a local game. */
export function matchXp(world: World, tankId: number, ctx: AwardContext): XpAward {
  const tank = world.tanks.find((t) => t.id === tankId);
  const s = world.stats[tankId];
  if (!tank || !s) return { lines: [], total: 0 };
  const won = world.mode.winner === tank.team;
  const lines: XpLine[] = [
    { label: `${s.kills} kills`, xp: s.kills * X.kill },
    { label: "Objectives", xp: s.queens * X.objective + campaignObjectives(world) * X.objective },
    { label: world.campaign ? "Mission" : "Match complete", xp: world.campaign ? (won ? X.campaignMission : 0) : X.matchComplete },
    { label: "Victory", xp: won && !world.campaign ? X.win : 0 },
    { label: `Grade ${ctx.grade ?? ""}`, xp: ctx.grade ? (X.grade as Record<string, number>)[ctx.grade] ?? 0 : 0 },
    { label: "First win today", xp: won && ctx.firstWinToday ? X.firstWinOfDay : 0 },
  ].filter((l) => l.xp > 0);
  const raw = lines.reduce((n, l) => n + l.xp, 0);
  if (!ctx.botsOnly || world.campaign) return { lines, total: raw };
  const total = Math.round(raw * X.botOnlyFactor);
  return { lines: [...lines, { label: "Bots only ×½", xp: total - raw }], total };
}

const campaignObjectives = (world: World): number => world.campaign?.objectives.filter((o) => o.done).length ?? 0;
