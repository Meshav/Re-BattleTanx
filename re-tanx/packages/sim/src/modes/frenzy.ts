import type { World } from "../world.ts";
import type { Queen } from "../entities/queen.ts";
import type { ModeRules } from "./mode.ts";
import type { SimEvent } from "../events.ts";
import { limitWin, noScore } from "./mode.ts";
import { modeDefs } from "../data/modeDefs.ts";
import { nextRandom } from "../math/rng.ts";
import { randomOpenPoint } from "../ai/nav/grid.ts";
import { addQueen, atOwnFortress, dropTimedOut, followCarrier, take, toucher } from "./queens.ts";

const def = modeDefs.frenzy;

function relocate(world: World, q: Queen): SimEvent {
  const p = randomOpenPoint(world, () => nextRandom(world.rng));
  Object.assign(q, { state: "home", carrierId: undefined, heldBy: undefined, droppedFor: 0, pos: p, home: p });
  return { type: "queen", what: "returned", queenId: q.id, team: -1, pos: { ...p } };
}

/** Global Assault's Frenzy: a QueenLord appears somewhere; bring her to your fortress. First to 10. */
export const frenzy: ModeRules = {
  usesFortresses: true,
  setup(world) {
    relocate(world, addQueen(world, -1, { x: 0, y: 0 }));
  },
  onTick(world) {
    return world.queens.flatMap((q): SimEvent[] => {
      const events = followCarrier(world, q);
      if (dropTimedOut(world, q, def.returnAfter)) return [...events, relocate(world, q)];
      const c = q.state === "carried" ? world.tanks.find((t) => t.id === q.carrierId) : undefined;
      if (c && atOwnFortress(world, c)) {
        world.mode.scores[c.team] = (world.mode.scores[c.team] ?? 0) + 1;
        return [...events, { type: "queen", what: "captured", queenId: q.id, team: c.team, pos: { ...q.pos } }, relocate(world, q)];
      }
      const t = q.state === "carried" ? undefined : toucher(world, q, () => true);
      return t ? [...events, take(q, t)] : events;
    });
  },
  onKill: noScore,
  canRespawn: () => true,
  checkWin: limitWin,
};
