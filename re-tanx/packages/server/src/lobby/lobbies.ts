import type { LobbySettings } from "@re-tanx/sim";
import { PROTOCOL_LIMITS, deployTank, mapById, missionById, type TankKind } from "@re-tanx/sim";
import { tankOk } from "../match/campaignMatch.ts";
import { send, type Client } from "../client.ts";
import { newCode } from "./codes.ts";
import { awaitingRejoin, createMatch, dropSeat, humansLeft, rejoinSeat, runMatch, sendStart, stopMatch, type Match } from "../match/match.ts";
import { awardMatch } from "../match/awards.ts";
import { scheduleAutoStart } from "./quickMatch.ts";
import type { Services } from "../services.ts";

export interface Lobby {
  code: string; hostId: number; members: Client[]; settings: LobbySettings; match: Match | undefined;
  /** everyone dropped: closes unless someone rejoins */
  closeTimer?: NodeJS.Timeout;
  /** public lobbies start by themselves at startsAt (ms) */
  startTimer?: NodeJS.Timeout; startsAt?: number;
}

/** The only global state on the server (doc 12 §12.4). */
export interface Lobbies { byCode: Map<string, Lobby>; svc: Services }

export const createLobbies = (svc: Services): Lobbies => ({ byCode: new Map(), svc });

function announce(l: Lobby): void {
  const members = l.members.map((c) => ({ id: c.id, name: c.name, gang: c.gang, host: c.id === l.hostId, ...(c.tank ? { tank: c.tank } : {}) }));
  const startsIn = l.startsAt ? Math.max(0, Math.ceil((l.startsAt - Date.now()) / 1000)) : undefined;
  for (const c of l.members) send(c, { t: "lobby", code: l.code, members, settings: l.settings, ...(startsIn !== undefined ? { startsIn } : {}) });
}

export function createLobby(ls: Lobbies, host: Client, settings: LobbySettings): void {
  leaveLobby(ls, host);
  if (ls.byCode.size >= PROTOCOL_LIMITS.maxLobbies) return send(host, { t: "error", message: "Server is full, try again soon" });
  const code = newCode((c) => ls.byCode.has(c), PROTOCOL_LIMITS.codeLength);
  const lobby: Lobby = { code, hostId: host.id, members: [host], settings, match: undefined };
  ls.byCode.set(code, lobby);
  host.lobby = code;
  scheduleAutoStart(ls, lobby);
  announce(lobby);
}

export function joinLobby(ls: Lobbies, c: Client, code: string): void {
  const l = ls.byCode.get(code);
  if (!l) return send(c, { t: "error", message: `No lobby ${code}` });
  if (l.match) return send(c, { t: "error", message: "That match already started" });
  if (l.members.length >= PROTOCOL_LIMITS.maxPlayers) return send(c, { t: "error", message: "Lobby is full" });
  leaveLobby(ls, c);
  l.members.push(c);
  c.lobby = code;
  scheduleAutoStart(ls, l);
  announce(l);
}

export function updateSettings(ls: Lobbies, c: Client, settings: LobbySettings): void {
  const l = c.lobby ? ls.byCode.get(c.lobby) : undefined;
  if (!l || l.hostId !== c.id || l.match) return;
  l.settings = settings;
  scheduleAutoStart(ls, l);
  announce(l);
}

export function refreshMember(ls: Lobbies, c: Client): void {
  const l = c.lobby ? ls.byCode.get(c.lobby) : undefined;
  if (l && !l.match) announce(l);
}

/** Campaign co-op: in the lobby, pick your opening tank; mid-mission, buy your next one from the shared wallet. */
export function deployFor(ls: Lobbies, c: Client, kind: TankKind): void {
  const l = c.lobby ? ls.byCode.get(c.lobby) : undefined;
  if (!l || l.settings.mode !== "campaign" || !tankOk(c, kind)) return;
  if (!l.match) {
    c.tank = kind;
    return announce(l);
  }
  const i = l.match.seats.findIndex((s) => s.client === c);
  if (i >= 0 && deployTank(l.match.world, l.match.seats[i]!.tankId, kind)) l.match.recorder.action(l.match.world, i, kind);
}

export function startLobby(ls: Lobbies, c: Client): void {
  const l = c.lobby ? ls.byCode.get(c.lobby) : undefined;
  if (!l || l.hostId !== c.id || l.match) return;
  if (l.settings.ranked && l.members.length < 2) return send(c, { t: "error", message: "Ranked needs at least two players" });
  beginMatch(ls, l);
}

export function beginMatch(ls: Lobbies, l: Lobby): void {
  clearTimeout(l.startTimer);
  l.startsAt = undefined;
  const mission = l.settings.mode === "campaign" ? missionById(l.settings.mission ?? "") : undefined;
  const map = mission?.map ?? l.settings.customMap ?? mapById(l.settings.map);
  // host first: in campaign co-op the wingmen follow (and carry the Oracles of) player one
  const members = [...l.members].sort((a, b) => Number(b.id === l.hostId) - Number(a.id === l.hostId));
  l.match = createMatch(map, l.settings, members);
  runMatch(l.match, map.id, () => {
    l.match = undefined;
    for (const m of l.members) send(m, { t: "ended" });
    scheduleAutoStart(ls, l); // public lobbies roll straight into the next match
    announce(l);
  }, (m) => void awardMatch(m, m.world, ls.svc).catch((e: unknown) => console.error("award failed", e)));
}

/**
 * Leaving (or disconnecting): bot takes over your tank mid-match; empty lobbies close; host passes on.
 * A dropped connection (`canRejoin`) keeps the seat claimable for a while, and a match with nobody left
 * keeps running for that long too, so a lone player whose wifi blinked can come back.
 */
export function leaveLobby(ls: Lobbies, c: Client, canRejoin = false): void {
  const l = c.lobby ? ls.byCode.get(c.lobby) : undefined;
  c.lobby = undefined;
  if (!l) return;
  l.members = l.members.filter((m) => m !== c);
  if (l.match) dropSeat(l.match, c, canRejoin);
  if (!l.members.length || (l.match && humansLeft(l.match) === 0)) {
    if (l.match && awaitingRejoin(l.match)) {
      clearTimeout(l.closeTimer);
      l.closeTimer = setTimeout(() => closeLobby(ls, l), PROTOCOL_LIMITS.rejoinGraceMs);
      return;
    }
    return closeLobby(ls, l);
  }
  if (l.hostId === c.id) l.hostId = l.members[0]!.id;
  announce(l);
}

export function closeLobby(ls: Lobbies, l: Lobby): void {
  clearTimeout(l.closeTimer);
  clearTimeout(l.startTimer);
  if (l.match) stopMatch(l.match);
  ls.byCode.delete(l.code);
}

/** Back into your running match after a dropped connection. */
export function rejoinLobby(ls: Lobbies, c: Client, code: string): void {
  const l = ls.byCode.get(code);
  if (!l?.match || !rejoinSeat(l.match, c)) return send(c, { t: "error", message: "That match is over or your seat is gone" });
  leaveLobby(ls, c);
  clearTimeout(l.closeTimer);
  l.members.push(c);
  c.lobby = code;
  const seat = l.match.seats.find((s) => s.client === c)!;
  sendStart(l.match, c, seat.tankId, l.settings.map);
}
