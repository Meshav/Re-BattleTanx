import type { Vec2 } from "../math/vec2.ts";
import type { Difficulty } from "../data/aiDefs.ts";

export type BehaviorId = "patrol" | "investigate" | "engage" | "retreat" | "seekPickup" | "objective" | "follow" | "escape";

export interface Memory { pos: Vec2; seenAt: number; visible: boolean }

/** Everything a bot remembers between ticks. Plain data, lives in world.bots. */
export interface BotState {
  difficulty: Difficulty;
  behavior: BehaviorId;
  nextThinkTick: number;
  memory: Record<number, Memory>;
  targetId: number | undefined;
  /** can't shoot a newly spotted target until this tick (reaction time) */
  reactReadyTick: number;
  aimOffset: number;
  aimRerollTick: number;
  path: Vec2[];
  pathGoal: Vec2 | undefined;
  replanTick: number;
  roamGoal: Vec2 | undefined;
  pickupId: number | undefined;
  stuckTicks: number;
  reverseUntilTick: number;
  /** target this bot is allowed to shoot at right now (attack tokens) */
  firingAt: number | undefined;
  /** wingmen follow this tank */
  leaderId?: number;
  /** runners drive here and get away */
  escapeTo?: { x: number; y: number };
}

export function createBot(difficulty: Difficulty): BotState {
  return {
    difficulty, behavior: "patrol", nextThinkTick: 0, memory: {}, targetId: undefined,
    reactReadyTick: 0, aimOffset: 0, aimRerollTick: 0, path: [], pathGoal: undefined, replanTick: 0,
    roamGoal: undefined, pickupId: undefined, stuckTicks: 0, reverseUntilTick: 0, firingAt: undefined,
  };
}
