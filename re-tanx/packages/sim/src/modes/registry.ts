import type { ModeConfig, ModeKind, ModeRules, ModeState } from "./mode.ts";
import { deathmatch, family, tankWars } from "./deathmatch.ts";
import { annihilation } from "./annihilation.ts";
import { battlelord } from "./battlelord.ts";
import { frenzy } from "./frenzy.ts";
import { holdEm } from "./holdEm.ts";
import { campaign } from "./campaign.ts";
import { koth } from "./koth.ts";
import { horde } from "./horde.ts";
import { lastGang } from "./lastGang.ts";
import { siege } from "./siege.ts";
import { convoy } from "./convoy.ts";
import { modeDefs } from "../data/modeDefs.ts";

export const modeRules: Record<ModeKind, ModeRules> = { deathmatch, annihilation, tankWars, family, battlelord, frenzy, holdEm, koth, horde, lastGang, siege, convoy, campaign };
/** Modes you can pick for a versus match (campaign is started from the campaign screen). */
export const modeKinds = (Object.keys(modeRules) as ModeKind[]).filter((k) => k !== "campaign");

export function createModeState(cfg: ModeConfig): ModeState {
  const d = modeDefs[cfg.kind];
  return {
    kind: cfg.kind, scoreLimit: cfg.scoreLimit ?? d.scoreLimit, timeLimit: cfg.timeLimit ?? d.timeLimit,
    elapsed: 0, scores: {}, over: false, winner: undefined,
  };
}
