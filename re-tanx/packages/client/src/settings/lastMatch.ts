import { difficulties, gangIds, modeKinds } from "@re-tanx/sim";
import { allArenas } from "../app/editor/customMaps.ts";
import { DEVICE_LABEL, type MatchConfig } from "../app/matchConfig.ts";

const KEY = "re-tanx:lastMatch";

/** Remember the last setup so Deploy is one click next time. Storage can be unavailable; that's fine. */
export function loadConfig(): MatchConfig | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    const cfg = raw ? (JSON.parse(raw) as MatchConfig) : undefined;
    return cfg && isValid(cfg) ? cfg : undefined;
  } catch {
    return undefined;
  }
}

export function saveConfig(cfg: MatchConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    // private mode / blocked storage: just don't remember
  }
}

/** Saved configs can outlive renamed gangs/modes; drop anything that no longer matches. */
function isValid(c: MatchConfig): boolean {
  return (modeKinds as string[]).includes(c.mode) && difficulties.includes(c.difficulty) && Array.isArray(c.players) && c.players.length > 0
    && c.players.every((p) => gangIds.includes(p.gang) && p.device in DEVICE_LABEL)
    && (c.map === undefined || allArenas().some((m) => m.id === c.map));
}
