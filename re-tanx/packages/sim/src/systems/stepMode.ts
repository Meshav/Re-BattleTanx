import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import { modeRules } from "../modes/registry.ts";

/** Feed kills to the mode, then ask it whether the match is decided. */
export function stepMode(world: World, events: SimEvent[]): SimEvent[] {
  const mode = world.mode;
  mode.elapsed += world.dt;
  const rules = modeRules[mode.kind];
  const objective = rules.onTick?.(world, events) ?? [];
  for (const e of events) {
    if (e.type !== "kill") continue;
    const victim = world.tanks.find((t) => t.id === e.victimId);
    if (victim) rules.onKill(world, victim, world.tanks.find((t) => t.id === e.killerId));
  }
  const winner = rules.checkWin(world);
  if (winner === undefined) return objective;
  mode.over = true;
  mode.winner = winner;
  return [...objective, { type: "matchOver", winner }];
}
