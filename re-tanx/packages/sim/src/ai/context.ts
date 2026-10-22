import type { World } from "../world.ts";
import type { Tank } from "../entities/tank.ts";
import type { BotState } from "./botState.ts";
import type { Vec2 } from "../math/vec2.ts";
import { aiDefs, archetypeFor } from "../data/aiDefs.ts";
import type { InputState } from "../input.ts";

/** Bots never strafe; the brain fills that in. */
export type BotInput = Omit<InputState, "strafe">;

export interface BotCtx {
  world: World; tank: Tank; bot: BotState;
  diff: (typeof aiDefs.difficulty)[keyof typeof aiDefs.difficulty];
  arch: (typeof aiDefs.archetypes)[keyof typeof aiDefs.archetypes];
  target: Tank | undefined;
  /** freshest remembered enemy position (seen or heard) */
  threat: Vec2 | undefined;
}

export function makeCtx(world: World, tank: Tank, bot: BotState): BotCtx {
  const target = world.tanks.find((t) => t.id === bot.targetId && t.alive);
  const latest = Object.values(bot.memory).sort((a, b) => b.seenAt - a.seenAt)[0];
  return {
    world, tank, bot, target, threat: target?.pos ?? latest?.pos,
    diff: aiDefs.difficulty[bot.difficulty], arch: aiDefs.archetypes[archetypeFor(tank.kind)],
  };
}
