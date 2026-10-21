import { stepMovement } from './systems/stepMovement';
import type { Inputs, World } from './world';

/** The only place that orders systems. Each system does one thing (doc 12 §12.4). */
export function stepWorld(world: World, inputs: Inputs, dt: number): void {
  stepMovement(world, inputs, dt);
  world.tick += 1;
}
