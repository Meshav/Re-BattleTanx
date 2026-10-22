import type { World } from "../world.ts";
import type { BotState } from "./botState.ts";
import { aiDefs } from "../data/aiDefs.ts";

/**
 * Attack tokens: only N bots may shoot at one target at a time; the rest reposition.
 * Keeps fights readable without making bots look dumb.
 */
export function takeToken(world: World, self: BotState, targetId: number): boolean {
  if (self.firingAt === targetId) return true;
  const limit = aiDefs.difficulty[self.difficulty].tokens;
  const holders = Object.values(world.bots).filter((b) => b !== self && b.firingAt === targetId).length;
  if (holders >= limit) return false;
  self.firingAt = targetId;
  return true;
}

export function releaseToken(self: BotState): void {
  self.firingAt = undefined;
}
