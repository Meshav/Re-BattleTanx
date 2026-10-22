import type { World } from "../world.ts";
import type { Tank } from "../entities/tank.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { campaignDefs } from "./missionDefs.ts";

const P = campaignDefs.points;

export function addScore(world: World, points: number): void {
  const c = world.campaign;
  if (!c) return;
  c.score += points;
  // original Global Assault: 10 Tank Bucks per 10,000 points
  const due = Math.floor(c.score / 10_000);
  if (due > c.bucksAwardedFor) {
    c.bucks += (due - c.bucksAwardedFor) * campaignDefs.bucksPer10k;
    c.bucksAwardedFor = due;
  }
}

export const killPoints = (victim: Tank): number => P[tankDefs[victim.kind].class as "light" | "medium" | "heavy"] ?? P.medium;

/** End-of-mission bonuses and letter grade. */
export function finalScore(world: World): { total: number; grade: string; timeBonus: number; noDeathBonus: number } {
  const c = world.campaign!;
  const par = c.mission.objectives.find((o) => o.kind === "parTime")?.seconds ?? 300;
  const timeBonus = Math.round(Math.max(0, 1 - c.elapsed / (par * 2)) * P.timeBonusMax);
  const noDeathBonus = c.playerDeaths === 0 ? P.noDeaths : 0;
  const total = c.score + timeBonus + noDeathBonus;
  const grade = (campaignDefs.grades as [string, number][]).find(([, min]) => total >= min)?.[0] ?? "C";
  return { total, grade, timeBonus, noDeathBonus };
}
