import { parseMap } from "../data/map.ts";
import { createWorld, type TankSlot, type World, type WorldOptions } from "../world.ts";
import type { InputState } from "../input.ts";
import { stepWorld } from "../stepWorld.ts";
import type { SimEvent } from "../events.ts";

/** Build a world from inline ASCII rows. Spawns 'S' are used in reading order. */
export function makeWorld(rows: string[], slots: TankSlot[], opts: WorldOptions = {}): World {
  return createWorld(parseMap({ id: "test", name: "test", cell: 10, rows }), slots, opts);
}

export function run(world: World, ticks: number, inputs: Record<number, Partial<InputState>> = {}): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < ticks; i++) {
    for (const [id, inp] of Object.entries(inputs)) {
      world.inputs[Number(id)] = { throttle: 0, steer: 0, strafe: 0, aim: 0, fire: false, special: false, cycle: 0, ...inp };
    }
    events.push(...stepWorld(world));
  }
  return events;
}
