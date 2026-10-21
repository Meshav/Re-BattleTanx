import { stepWorld, TICK_DT, type EntityId, type Inputs, type World } from '@re-tanx/sim';

export interface Pose {
  x: number;
  y: number;
  heading: number;
}

export interface LoopHooks {
  readInputs(): Inputs;
  render(prev: ReadonlyMap<EntityId, Pose>, alpha: number): void;
}

/** Fixed-step sim at TICK_RATE; render at display rate, interpolating from the previous tick. */
export function startLoop(world: World, hooks: LoopHooks): void {
  let prev = snapshotPoses(world);
  let accumulator = 0;
  let last = performance.now();

  function frame(now: number): void {
    accumulator += Math.min((now - last) / 1000, 0.25); // clamp: a tab in the background doesn't fast-forward
    last = now;

    while (accumulator >= TICK_DT) {
      prev = snapshotPoses(world);
      stepWorld(world, hooks.readInputs(), TICK_DT);
      accumulator -= TICK_DT;
    }

    hooks.render(prev, accumulator / TICK_DT);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function snapshotPoses(world: World): Map<EntityId, Pose> {
  return new Map(world.tanks.map((t) => [t.id, { x: t.x, y: t.y, heading: t.heading }]));
}
