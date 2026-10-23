import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import { rules } from "../data/rules.ts";

/**
 * Pre-match count-in, as in the original: the arena title, then 3-2-1, then play.
 * Nothing moves, fires or scores meanwhile; one event per beat drives the HUD and audio.
 */
export function stepCountdown(world: World): SimEvent[] {
  const left = --world.mode.countdown!;
  const beat = rules.countdown.beatTicks;
  return left % beat === 0 ? [{ type: "countdown", left: left / beat }] : [];
}
