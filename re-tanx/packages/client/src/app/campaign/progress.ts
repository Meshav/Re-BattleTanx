import { campaignDefs, campaignMissions, difficulties, type Difficulty } from "@re-tanx/sim";

export interface Progress { bucks: number; unlocked: number; grades: Record<string, string>; difficulty: Difficulty; players: 1 | 2 }

const KEY = "re-tanx:campaign";
export const freshProgress = (): Progress => ({ bucks: campaignDefs.startBucks, unlocked: 0, grades: {}, difficulty: "normal", players: 1 });

/** Campaign save. Guest progress lives in this browser only (accounts arrive in Phase 6). */
export function loadProgress(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "null") as Progress | null;
    const ok = p && Number.isFinite(p.bucks) && Number.isInteger(p.unlocked) && difficulties.includes(p.difficulty);
    return ok ? { ...freshProgress(), ...p } : freshProgress();
  } catch {
    return freshProgress();
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage blocked: progress lasts this session only
  }
}

const RANK = ["C", "B", "A", "S"];
export const betterGrade = (a: string | undefined, b: string): string => (a && RANK.indexOf(a) >= RANK.indexOf(b) ? a : b);

/** A won mission unlocks the next and keeps the better grade. `bucks`: the wallet carries over (local play; online co-op uses the server's). */
export function recordWin(missionId: string, grade: string, bucks?: number): void {
  const p = loadProgress();
  const i = campaignMissions.findIndex((m) => m.id === missionId);
  if (bucks !== undefined) p.bucks = bucks;
  p.unlocked = Math.max(p.unlocked, Math.min(i + 1, campaignMissions.length - 1));
  p.grades[missionId] = betterGrade(p.grades[missionId], grade);
  saveProgress(p);
}
