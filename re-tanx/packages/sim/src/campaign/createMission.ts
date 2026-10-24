import type { MissionDef } from "./missionDefs.ts";
import type { TankKind } from "../data/tankDefs.ts";
import type { Loadout } from "../progression/loadout.ts";
import type { OracleLink } from "../entities/tank.ts";
import { oracleDefs } from "../progression/oracles.ts";
import type { Difficulty } from "../data/aiDefs.ts";
import { parseMap } from "../data/map.ts";
import { createWorld, type World } from "../world.ts";
import { createCampaignState } from "./state.ts";
import { deployCost } from "./deploy.ts";

/**
 * loadouts: each human's perks, upgrades and Oracle, by player index (campaign always has upgrades on; local split-screen
 * has one profile, so only P1's). allyOracles: Oracles riding with the wingmen, in order. names: online players' names.
 */
export interface MissionStart {
  mission: MissionDef; players: TankKind[]; bucks: number; difficulty: Difficulty; seed?: number; countdown?: boolean;
  loadouts?: Loadout[]; allyOracles?: OracleLink[]; names?: string[];
}

/** Build a mission world: humans first (paying for their opening tanks), then wingmen following P1. */
export function createMissionWorld(s: MissionStart): World {
  const humans = s.players.map((kind, i) => ({ team: 0, kind, name: s.names?.[i] ?? `P${i + 1}`, ...s.loadouts?.[i] }));
  const allies = s.mission.allies.map((kind, i) => {
    const oracle = s.allyOracles?.[i];
    return { team: 0, kind, bot: "normal" as const, name: oracle ? `Wingman · ${oracleDefs[oracle.id].name}` : "Wingman", ...(oracle ? { oracle } : {}) };
  });
  const cost = s.players.reduce((sum, k) => sum + deployCost(s, k), 0);
  const world = createWorld(parseMap(s.mission.map), [...humans, ...allies], {
    seed: s.seed ?? 1, mode: { kind: "campaign", ...(s.countdown ? { countdown: true } : {}) },
    campaign: createCampaignState(s.mission, s.bucks - cost, s.difficulty, s.bucks),
  });
  const leader = world.tanks[0];
  if (leader && humans.length) for (const t of world.tanks.slice(humans.length)) world.bots[t.id]!.leaderId = leader.id;
  return world;
}
