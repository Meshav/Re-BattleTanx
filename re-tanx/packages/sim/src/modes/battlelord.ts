import type { World } from "../world.ts";
import type { Queen } from "../entities/queen.ts";
import type { ModeRules } from "./mode.ts";
import type { SimEvent } from "../events.ts";
import { leader, noScore } from "./mode.ts";
import { addRails, stepRails } from "./rail.ts";
import { modeDefs } from "../data/modeDefs.ts";
import { addQueen, atOwnFortress, dropTimedOut, followCarrier, fortressOf, sendHome, take, toucher } from "./queens.ts";

const def = modeDefs.battlelord;
const RANK: Record<Queen["state"], number> = { held: 0, dropped: 1, carried: 2, home: 3 };

/**
 * Original Battlelord: steal ALL of an enemy's QueenLords to your fortress. Owners can rescue
 * captives from an enemy fortress; a dropped queen goes home when an owner touches her or after a timeout.
 */
export const battlelord: ModeRules = {
  usesFortresses: true,
  setup(world) {
    world.map.fortresses.forEach((f, team) => {
      for (let i = 0; i < def.queensPerTeam; i++) {
        const a = (i / def.queensPerTeam) * Math.PI * 2;
        addQueen(world, team, { x: f.x + Math.cos(a) * 3, y: f.y + Math.sin(a) * 3 });
      }
    });
    addRails(world);
  },
  onTick(world) {
    // captives first, so a tank standing in an enemy fortress rescues its own queen before stealing another
    const order = [...world.queens].sort((a, b) => RANK[a.state] - RANK[b.state]);
    return [...stepRails(world), ...order.flatMap((q) => [...followCarrier(world, q), ...grab(world, q), ...deliver(world, q)])];
  },
  onKill: noScore,
  canRespawn: () => true,
  checkWin(world) {
    const teams = [...new Set(world.queens.map((q) => q.team))];
    for (const t of teams) world.mode.scores[t] = world.queens.filter((q) => q.heldBy === t).length;
    const won = teams.find((t) => world.queens.filter((q) => q.team !== t).every((q) => q.heldBy === t));
    if (won !== undefined) return won;
    const { timeLimit, elapsed, scores } = world.mode;
    return timeLimit > 0 && elapsed >= timeLimit ? leader(scores, teams) : undefined;
  },
};

function grab(world: World, q: Queen): SimEvent[] {
  if (q.state === "carried") return [];
  if (dropTimedOut(world, q, def.returnAfter)) return [sendHome(q)];
  if (q.state === "dropped") {
    const owner = toucher(world, q, (t) => t.team === q.team);
    if (owner) return [sendHome(q)];
  }
  const thief = toucher(world, q, (t) => t.team !== q.team && t.team !== q.heldBy);
  const rescuer = q.state === "held" ? toucher(world, q, (t) => t.team === q.team) : undefined;
  const who = rescuer ?? thief;
  return who ? [take(q, who)] : [];
}

/** Carrier reaches its own fortress: a rescued queen goes home, a stolen one becomes a captive. */
function deliver(world: World, q: Queen): SimEvent[] {
  const c = q.state === "carried" ? world.tanks.find((t) => t.id === q.carrierId) : undefined;
  if (!c || !atOwnFortress(world, c)) return [];
  if (c.team === q.team) return [sendHome(q)];
  const f = fortressOf(world, c.team)!;
  const held = world.queens.filter((k) => k.heldBy === c.team).length;
  Object.assign(q, { state: "held", heldBy: c.team, carrierId: undefined, pos: { x: f.x - 4 + held * 2, y: f.y + 4 } });
  return [{ type: "queen", what: "captured", queenId: q.id, team: c.team, pos: { ...q.pos } }];
}
