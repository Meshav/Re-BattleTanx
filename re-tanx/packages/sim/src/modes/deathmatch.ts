import type { ModeRules } from "./mode.ts";
import { limitWin, scoreKill } from "./mode.ts";
import { modeDefs } from "../data/modeDefs.ts";

/** First team to the kill limit (original: 7). Rosters cycle on every respawn. */
export const deathmatch: ModeRules = { onKill: scoreKill, canRespawn: () => true, checkWin: limitWin };

/** Global Assault's Tank Wars: three minutes, most kills wins. */
export const tankWars: ModeRules = { ...deathmatch };

/** Original Family Mode: short deathmatch, softer hits, specials used up in order (no switching). */
export const family: ModeRules = { ...deathmatch, damageScale: modeDefs.family.damageScale, allowCycle: modeDefs.family.allowCycle };
