import type { World } from "../world.ts";
import type { Tank } from "../entities/tank.ts";
import type { InputState } from "../input.ts";
import type { BehaviorId, BotState } from "./botState.ts";
import { aiDefs } from "../data/aiDefs.ts";
import { makeCtx, type BotCtx, type BotInput } from "./context.ts";
import { perceive, pickTarget } from "./perception.ts";
import { patrol } from "./behaviors/patrol.ts";
import { investigate } from "./behaviors/investigate.ts";
import { engage } from "./behaviors/engage.ts";
import { retreat } from "./behaviors/retreat.ts";
import { seekPickup } from "./behaviors/seekPickup.ts";
import { objective } from "./behaviors/objective.ts";
import { follow } from "./behaviors/follow.ts";
import { escape } from "./behaviors/escape.ts";
import { specialInput, wantSpecial } from "./specials.ts";
import { steerGuided } from "./guidedPilot.ts";

interface Behavior { score(ctx: BotCtx): number; act(ctx: BotCtx): BotInput }

const behaviors: Record<BehaviorId, Behavior> = { patrol, investigate, engage, retreat, seekPickup, objective, follow, escape };

/** Utility pick with hysteresis so bots don't flip-flop between near-equal options. */
export function think(world: World, tank: Tank, bot: BotState): void {
  perceive(world, tank, bot);
  const target = pickTarget(world, tank, bot);
  if (target && target.id !== bot.targetId) bot.reactReadyTick = world.tick + Math.round(aiDefs.difficulty[bot.difficulty].reaction / world.dt);
  bot.targetId = target?.id;
  const ctx = makeCtx(world, tank, bot);
  let best: BehaviorId = bot.behavior, bestScore = -Infinity;
  for (const [id, b] of Object.entries(behaviors) as [BehaviorId, Behavior][]) {
    const s = b.score(ctx) * (id === bot.behavior ? 1 + aiDefs.hysteresis : 1);
    if (s > bestScore) { best = id; bestScore = s; }
  }
  bot.behavior = best;
  bot.nextThinkTick = world.tick + Math.round(1 / aiDefs.thinkHz / world.dt);
}

export function act(world: World, tank: Tank, bot: BotState): InputState {
  const ctx = makeCtx(world, tank, bot);
  const input = { strafe: 0, ...behaviors[bot.behavior].act(ctx) };
  const guided = steerGuided(ctx);
  if (guided !== undefined) return { ...input, steer: guided };
  return { ...input, ...specialInput(ctx, wantSpecial(ctx)) };
}
