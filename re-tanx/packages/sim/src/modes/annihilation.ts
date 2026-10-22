import type { ModeRules } from "./mode.ts";
import type { World } from "../world.ts";
import type { Tank } from "../entities/tank.ts";
import { scoreKill, teamsOf } from "./mode.ts";

/** A tank is still in the fight if it's alive or has roster tanks left to deploy. */
const inFight = (world: World, t: Tank) => t.alive || annihilation.canRespawn(world, t);

/** Your gang's five tanks are your lives. Last team with a tank wins. */
export const annihilation: ModeRules = {
  onKill: scoreKill,
  canRespawn: (_world, tank) => tank.deaths < tank.roster.length,
  checkWin(world) {
    const standing = teamsOf(world).filter((team) => world.tanks.some((t) => t.team === team && inFight(world, t)));
    if (standing.length > 1) return undefined;
    return standing[0] ?? -1;
  },
};
