import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import { specialDefs } from "../data/specialDefs.ts";

/** Plant a timed nuke where the tank stands. Run. */
export function plantNuke(world: World, tank: Tank): SimEvent[] {
  const fuse = specialDefs.nuke.fuse;
  world.nukes.push({ id: world.nextId++, ownerId: tank.id, pos: { ...tank.pos }, fuse });
  return [{ type: "special", tankId: tank.id, kind: "nuke", super: false, pos: { ...tank.pos } }];
}
