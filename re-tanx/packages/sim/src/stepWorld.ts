import type { World } from "./world.ts";
import type { SimEvent } from "./events.ts";
import { stepMovement } from "./systems/stepMovement.ts";
import { stepTankCollisions } from "./systems/stepTankCollisions.ts";
import { stepFiring } from "./systems/stepFiring.ts";
import { stepProjectiles } from "./systems/stepProjectiles.ts";
import { stepRespawn } from "./systems/stepRespawn.ts";
import { stepSpecials } from "./systems/stepSpecials.ts";
import { stepMissiles } from "./systems/stepMissiles.ts";
import { stepMines } from "./systems/stepMines.ts";
import { stepNukes } from "./systems/stepNukes.ts";
import { stepPickups } from "./systems/stepPickups.ts";
import { stepBots } from "./systems/stepBots.ts";
import { stepMode } from "./systems/stepMode.ts";
import { stepStatus } from "./systems/stepStatus.ts";
import { stepTurrets } from "./systems/stepTurrets.ts";
import { stepStats } from "./progression/stats.ts";
import { recordHistory } from "./systems/lagComp.ts";
import { stepCountdown } from "./systems/stepCountdown.ts";

/** The only place that orders systems. One call = one fixed tick. */
export function stepWorld(world: World): SimEvent[] {
  if (world.mode.over) return [];
  world.tick++;
  if (world.mode.countdown) return stepCountdown(world);
  stepBots(world);
  stepMovement(world);
  recordHistory(world);
  const events = [
    ...stepTankCollisions(world),
    ...stepFiring(world),
    ...stepSpecials(world),
    ...stepProjectiles(world),
    ...stepMissiles(world),
    ...stepMines(world),
    ...stepNukes(world),
    ...stepTurrets(world),
    ...stepPickups(world),
    ...stepStatus(world),
    ...stepRespawn(world),
  ];
  events.push(...stepMode(world, events));
  stepStats(world, events);
  world.recentEvents = events;
  return events;
}
