import type { MissionDef } from "./missionDefs.ts";
import type { TankKind } from "../data/tankDefs.ts";
import type { Difficulty } from "../data/aiDefs.ts";

export interface ObjectiveState { done: boolean; failed: boolean }

/** Everything the campaign mode tracks during one mission. Plain data, lives on world.campaign. */
export interface CampaignState {
  mission: MissionDef;
  difficulty: Difficulty;
  bucks: number;
  /** bucks the player walked in with — a failed mission retries from here */
  bucksOnEntry: number;
  score: number;
  bucksAwardedFor: number;
  objectives: ObjectiveState[];
  wavesSpawned: boolean[];
  /** enemy tank ids per wave */
  waveTanks: number[][];
  elapsed: number;
  playerDeaths: number;
  cachesFound: number;
  /** chosen and paid for, waiting to respawn */
  pendingDeploy: Record<number, TankKind>;
  outcome: "playing" | "won" | "lost";
  failReason: string | undefined;
  decoySprung: boolean;
  runners: number[];
}

export function createCampaignState(mission: MissionDef, bucks: number, difficulty: Difficulty, entryBucks = bucks): CampaignState {
  return {
    mission, difficulty, bucks, bucksOnEntry: entryBucks, score: 0, bucksAwardedFor: 0,
    objectives: mission.objectives.map(() => ({ done: false, failed: false })),
    wavesSpawned: mission.waves.map(() => false), waveTanks: mission.waves.map(() => []),
    elapsed: 0, playerDeaths: 0, cachesFound: 0, pendingDeploy: {}, outcome: "playing", failReason: undefined, decoySprung: false, runners: [],
  };
}
