import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { dist } from "../math/vec2.ts";
import { applySplash } from "./applySplash.ts";

const def = specialDefs.mine;

/** Armed mines blow when an enemy tank rolls over them. */
export function stepMines(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  world.mines = world.mines.filter((mine) => {
    mine.armIn = Math.max(0, mine.armIn - world.dt);
    if (mine.armIn > 0) return true;
    const victim = world.tanks.find((t) => t.alive && t.team !== mine.team && dist(t.pos, mine.pos) <= def.triggerRadius + tankDefs[t.kind].radius * 0.5);
    if (!victim) return true;
    events.push({ type: "mineTrigger", pos: { ...mine.pos } });
    events.push(...applySplash(world, { pos: mine.pos, radius: def.splash, damage: def.damage, sourceId: mine.ownerId, direct: victim }));
    return false;
  });
  return events;
}
