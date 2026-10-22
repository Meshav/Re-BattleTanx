import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import { dist } from "../math/vec2.ts";
import { addQueen, followCarrier, take, toucher } from "../modes/queens.ts";

const EXTRACT_RADIUS = 9;

/** Captive QueenLords start at 'Q' cells; bring one to an 'E' extraction point. Some may be decoys. */
export function setupCaptives(world: World): void {
  world.map.captives.forEach((pos, i) => {
    const q = addQueen(world, 0, pos);
    if (world.campaign?.mission.decoys?.includes(i)) decoyIds.set(world, [...(decoyIds.get(world) ?? []), q.id]);
  });
}

// decoys are campaign-only bookkeeping, keyed by world so the World type stays clean
const decoyIds = new WeakMap<World, number[]>();

/** A decoy "QueenLord" was a trap: she vanishes and the ambush waves roll in. */
function springDecoy(world: World, qId: number): SimEvent[] {
  const q = world.queens.find((k) => k.id === qId)!;
  world.queens = world.queens.filter((k) => k.id !== qId);
  if (world.campaign) world.campaign.decoySprung = true;
  return [{ type: "explode", pos: { ...q.pos }, radius: 6 }, { type: "queen", what: "dropped", queenId: qId, team: 0, pos: { ...q.pos } }];
}

export function stepRescue(world: World): SimEvent[] {
  return world.queens.flatMap((q): SimEvent[] => {
    const events = followCarrier(world, q);
    const atExtraction = world.map.extraction.find((e) => dist(e, q.pos) <= EXTRACT_RADIUS);
    if (q.state === "carried" && atExtraction) {
      Object.assign(q, { state: "home", carrierId: undefined, home: { ...atExtraction }, pos: { ...atExtraction } });
      return [...events, { type: "queen", what: "captured", queenId: q.id, team: 0, pos: { ...q.pos } }];
    }
    if (q.state === "carried" || atExtraction) return events;
    const rescuer = toucher(world, q, (t) => t.team === 0);
    if (rescuer && decoyIds.get(world)?.includes(q.id)) return [...events, ...springDecoy(world, q.id)];
    return rescuer ? [...events, take(q, rescuer)] : events;
  });
}
