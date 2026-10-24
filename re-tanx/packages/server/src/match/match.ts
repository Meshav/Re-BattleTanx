import {
  createBot, createLagComp, createRecorder, createWorld, makeSnapshot, parseMap, pickupsKey, rules, stepWorld, structureStages,
  PROTOCOL_LIMITS, type LobbySettings, type MapJson, type Recorder, type SimEvent, type TankSlot, type World, gangIds, loadoutOf, createMissionWorld, missionById,
} from "@re-tanx/sim";
import { createQueue, nextInput, type InputQueue } from "./inputs.ts";
import { missionSetupFor } from "./campaignMatch.ts";
import { send, type Client } from "../client.ts";

const SNAP_HZ = 20;
const FULL_EVERY_TICKS = 30;

interface Seat { client: Client | undefined; profileId: string | undefined; name: string; tankId: number; /** dropped connection: can reclaim the tank until this time (ms) */ awayUntil: number | undefined; queue: InputQueue; sentStages: string; sentPickups: string; full: boolean }

/** One running game: a World, its seats, and a 30 Hz ticker. Nothing is shared between matches. */
export interface Match { world: World; startedAt: number; ranked: boolean; customMap: MapJson | undefined; /** campaign co-op mission id */ mission?: string | undefined; seats: Seat[]; timer: NodeJS.Timeout | undefined; snapAcc: number; events: SimEvent[]; overAt: number; recorder: Recorder }

export function createMatch(map: MapJson, settings: LobbySettings, members: Client[]): Match {
  if (settings.mode === "campaign") return createCoopMission(settings, members);
  const humans: TankSlot[] = members.map((c, i) => ({ team: settings.teams === "ffa" ? i : 0, gang: c.gang, name: c.name, ...(c.profile ? loadoutOf(c.profile, c.perks, c.oracle) : { perks: c.perks }) }));
  const bots: TankSlot[] = Array.from({ length: settings.bots }, (_, i) => ({
    team: settings.teams === "ffa" ? members.length + i : 1, gang: gangIds[(i + members.length) % gangIds.length]!, bot: settings.difficulty,
  }));
  const seed = (Date.now() & 0x7fffffff) || 1;
  const slots = [...humans, ...bots];
  const opts = { seed, perks: settings.perks, mode: { kind: settings.mode, countdown: true, ...(settings.scoreLimit > 0 ? { scoreLimit: settings.scoreLimit } : {}) } };
  const world = createWorld(parseMap(map), slots, opts);
  world.lagComp = createLagComp();
  const seats = members.map((client, i) => ({ client, profileId: client.profileId, name: client.name, tankId: world.tanks[i]!.id, awayUntil: undefined, queue: createQueue(), sentStages: "", sentPickups: "", full: true }));
  return { world, startedAt: Date.now(), ranked: settings.ranked, customMap: settings.customMap, seats, timer: undefined, snapAcc: 0, events: [], overAt: 0, recorder: createRecorder({ map: map.id, slots, opts, lagComp: true, ...(settings.customMap ? { customMap: settings.customMap } : {}) }, seats.length) };
}

/** Campaign co-op: the mission world (humans first, then the wingmen), recorded as a mission replay. */
function createCoopMission(settings: LobbySettings, members: Client[]): Match {
  const setup = missionSetupFor(settings, members, (Date.now() & 0x7fffffff) || 1);
  const world = createMissionWorld({ ...setup, mission: missionById(setup.id)! });
  world.lagComp = createLagComp();
  const seats = members.map((client, i) => ({ client, profileId: client.profileId, name: client.name, tankId: world.tanks[i]!.id, awayUntil: undefined, queue: createQueue(), sentStages: "", sentPickups: "", full: true }));
  return { world, startedAt: Date.now(), ranked: false, customMap: undefined, mission: setup.id, seats, timer: undefined, snapAcc: 0, events: [], overAt: 0, recorder: createRecorder({ map: "", slots: [], opts: {}, lagComp: true, mission: setup }, seats.length) };
}

export function runMatch(m: Match, mapId: string, onEnd: () => void, onFinish: (m: Match) => void = () => {}): void {
  for (const s of m.seats) if (s.client) sendStart(m, s.client, s.tankId, mapId);
  m.timer = setInterval(() => tick(m, onEnd, onFinish), 1000 / rules.tickRate);
}

/** One server tick (exported for tests; runMatch drives it at 30 Hz). */
export function tick(m: Match, onEnd: () => void, onFinish: (m: Match) => void): void {
  for (const s of m.seats) {
    if (s.client) m.world.inputs[s.tankId] = nextInput(s.queue);
    const view = s.client ? s.queue.view : undefined; // bots that took a seat shoot in the present
    if (view === undefined) delete m.world.lagComp!.view[s.tankId];
    else m.world.lagComp!.view[s.tankId] = view;
  }
  m.recorder.record(m.world);
  m.events.push(...stepWorld(m.world));
  m.snapAcc += SNAP_HZ / rules.tickRate;
  if (m.world.tick % FULL_EVERY_TICKS === 0) for (const s of m.seats) s.full = true;
  if (m.snapAcc >= 1 || m.world.mode.over) broadcast(m);
  if (m.world.mode.over && !m.overAt) {
    m.overAt = Date.now();
    onFinish(m);
    const replay = m.recorder.finish(m.world);
    for (const s of m.seats) if (s.client) send(s.client, { t: "replay", replay });
  }
  if (m.overAt && Date.now() - m.overAt > 6000) {
    stopMatch(m);
    onEnd();
  }
}

function broadcast(m: Match): void {
  m.snapAcc = Math.max(0, m.snapAcc - 1);
  const stages = structureStages(m.world);
  const pk = pickupsKey(m.world);
  for (const s of m.seats) {
    if (!s.client) continue;
    const snap = makeSnapshot(m.world, { meId: s.tankId, full: s.full, stages: stages !== s.sentStages ? stages : undefined, pickups: pk !== s.sentPickups });
    send(s.client, { t: "snap", ack: s.queue.ack, snap, events: m.events });
    s.sentStages = stages;
    s.sentPickups = pk;
    s.full = false;
  }
  m.events = [];
}

/** A player who leaves mid-match is replaced by a bot so the match stays fair for everyone else. A dropped connection can come back (rejoinSeat). */
export function dropSeat(m: Match, client: Client, canRejoin = false): void {
  const seat = m.seats.find((s) => s.client === client);
  if (!seat) return;
  seat.client = undefined;
  seat.awayUntil = canRejoin && seat.profileId ? Date.now() + PROTOCOL_LIMITS.rejoinGraceMs : undefined;
  m.world.bots[seat.tankId] = createBot("normal");
  m.recorder.action(m.world, m.seats.indexOf(seat), "bot");
}

export const humansLeft = (m: Match): number => m.seats.filter((s) => s.client).length;

/** Someone who may still come back for their tank. */
export const awaitingRejoin = (m: Match, now = Date.now()): boolean => m.seats.some((s) => !s.client && (s.awayUntil ?? 0) > now);

/** Same player (by profile id) reclaims their tank from the bot: fresh input queue, full snapshot next. */
export function rejoinSeat(m: Match, client: Client, now = Date.now()): boolean {
  const i = m.seats.findIndex((s) => !s.client && s.profileId !== undefined && s.profileId === client.profileId && (s.awayUntil ?? 0) > now);
  const seat = m.seats[i];
  if (!seat) return false;
  Object.assign(seat, { client, awayUntil: undefined, queue: createQueue(), sentStages: "", sentPickups: "", full: true });
  delete m.world.bots[seat.tankId];
  m.recorder.action(m.world, i, "human");
  return true;
}

export function stopMatch(m: Match): void {
  if (m.timer) clearInterval(m.timer);
  m.timer = undefined;
}

export function sendStart(m: Match, c: Client, tankId: number, mapId: string): void {
  send(c, { t: "start", mapId, tankId, seed: m.world.rng.state, mode: m.world.mode.kind, ...(m.customMap ? { map: m.customMap } : {}), ...(m.mission ? { mission: m.mission } : {}) });
}
