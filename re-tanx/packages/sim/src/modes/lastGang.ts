import type { ModeRules } from "./mode.ts";
import { limitWin, noScore, teamsOf } from "./mode.ts";
import { modeDefs } from "../data/modeDefs.ts";
import { respawnTank } from "../systems/stepRespawn.ts";

/** Last Gang Standing: one life per round, last team alive takes the round, first to N rounds wins. */
export const lastGang: ModeRules = {
  setup(world) {
    world.mode.round = 1;
    world.mode.nextRoundIn = 0;
  },
  onTick(world) {
    const m = world.mode;
    if (m.nextRoundIn! > 0) {
      m.nextRoundIn! -= world.dt;
      if (m.nextRoundIn! > 0) return [];
      m.round! += 1;
      return world.tanks.filter((t) => !t.alive).map((t) => respawnTank(world, t));
    }
    const teams = teamsOf(world);
    const standing = teams.filter((team) => world.tanks.some((t) => t.team === team && t.alive));
    if (teams.length < 2 || standing.length > 1) return [];
    const winner = standing[0] ?? -1; // everyone died together: nobody scores
    if (winner >= 0) m.scores[winner] = (m.scores[winner] ?? 0) + 1;
    m.nextRoundIn = modeDefs.lastGang.roundBreak;
    return [{ type: "round", round: m.round!, winner }];
  },
  onKill: noScore,
  canRespawn: () => false,
  // the round is scored in onTick, which runs first, so the deciding round ends the match the same tick
  checkWin: limitWin,
};
