import type { ModeRules } from "./mode.ts";
import type { SimEvent } from "../events.ts";
import { limitWin, noScore } from "./mode.ts";
import { modeDefs } from "../data/modeDefs.ts";
import { isSolidCell } from "../queries/cells.ts";
import { addQueen, dropTimedOut, followCarrier, sendHome, take, toucher } from "./queens.ts";

const def = modeDefs.holdEm;

/** One QueenLord. Every second you hold her scores; the carrier is slower and shows on everyone's radar. */
export const holdEm: ModeRules = {
  usesFortresses: false,
  setup(world) {
    const { cols, rows, cell } = world.map;
    let cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
    while (isSolidCell(world, cx, cy) && cx > 0) cx--;
    addQueen(world, -1, { x: (cx + 0.5) * cell, y: (cy + 0.5) * cell });
  },
  onTick(world) {
    return world.queens.flatMap((q): SimEvent[] => {
      const events = followCarrier(world, q);
      if (dropTimedOut(world, q, def.returnAfter)) return [...events, sendHome(q)];
      const c = q.state === "carried" ? world.tanks.find((t) => t.id === q.carrierId) : undefined;
      if (c) world.mode.scores[c.team] = (world.mode.scores[c.team] ?? 0) + def.pointsPerSecond * world.dt;
      const t = c ? undefined : toucher(world, q, () => true);
      return t ? [...events, take(q, t)] : events;
    });
  },
  onKill: noScore,
  canRespawn: () => true,
  checkWin: limitWin,
};
