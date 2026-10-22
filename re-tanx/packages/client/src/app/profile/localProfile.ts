import { applyMatch, sanitizeProfile, today, type MatchResult, type Profile, type World } from "@re-tanx/sim";

const KEY = "re-tanx:profile";

/** Guest profile for local play. Online play uses the server's copy (the server awards XP there). */
export function loadProfile(): Profile {
  try {
    return sanitizeProfile(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return sanitizeProfile(undefined);
  }
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage blocked: progress lasts this session only
  }
}

/** Award the local P1 for a finished match and persist. shortcut: split-screen P2–P4 don't earn XP (one profile per browser). */
export function awardLocal(world: World, grade?: string): MatchResult {
  const humans = world.tanks.filter((t) => !world.bots[t.id]);
  const me = humans[0];
  const r = applyMatch(loadProfile(), world, me?.id ?? -1, { botsOnly: humans.length <= 1, day: today(), ...(grade ? { grade } : {}) });
  saveProfile(r.profile);
  return r;
}
