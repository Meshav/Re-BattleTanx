import type { World } from "../world.ts";
import { act, think } from "../ai/brain.ts";
import { releaseToken } from "../ai/tokens.ts";

/** Bots write their inputs before the rest of the tick runs, exactly like a human's. */
export function stepBots(world: World): void {
  for (const tank of world.tanks) {
    const bot = world.bots[tank.id];
    if (!bot) continue;
    if (!tank.alive) {
      releaseToken(bot);
      bot.path = [];
      bot.memory = {};
      continue;
    }
    if (world.tick >= bot.nextThinkTick) think(world, tank, bot);
    world.inputs[tank.id] = act(world, tank, bot);
  }
}
