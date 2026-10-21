import type { EntityId, Tank } from './entities/tank';
import type { InputState } from './input';

/** Plain data. Systems are pure functions over it; no classes, no hidden state. */
export interface World {
  tick: number;
  tanks: Tank[];
}

/** Inputs for this tick, keyed by tank id. Tanks without an entry coast. */
export type Inputs = ReadonlyMap<EntityId, InputState>;

export const TICK_RATE = 30;
export const TICK_DT = 1 / TICK_RATE;

export function createWorld(): World {
  return { tick: 0, tanks: [] };
}
