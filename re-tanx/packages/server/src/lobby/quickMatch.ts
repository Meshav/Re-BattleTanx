import { PROTOCOL_LIMITS, sanitizeSettings } from "@re-tanx/sim";
import type { Client } from "../client.ts";
import { beginMatch, createLobby, joinLobby, type Lobbies, type Lobby } from "./lobbies.ts";

/** Public lobby timing: alone you wait a bit for company, with company it starts soon, full it starts now. */
export const AUTO_START = { aloneMs: 30_000, groupMs: 15_000, fullMs: 3_000 } as const;

/** What quick match opens when nothing is waiting: a casual deathmatch with bots to fill. */
export const QUICK_SETTINGS = sanitizeSettings({ mode: "deathmatch", bots: 3, difficulty: "normal", teams: "ffa", map: "graybox", public: true });

/** Quick match: join the fullest open public lobby (they start sooner), or open a new one. */
export function quickMatch(ls: Lobbies, c: Client): void {
  const open = [...ls.byCode.values()]
    .filter((l) => l.settings.public && !l.match && l.members.length < PROTOCOL_LIMITS.maxPlayers && !l.members.includes(c))
    .sort((a, b) => b.members.length - a.members.length)[0];
  if (open) joinLobby(ls, c, open.code);
  else createLobby(ls, c, QUICK_SETTINGS);
}

/** (Re)arm a public lobby's start timer. Joining can only bring the start earlier; going private cancels it. */
export function scheduleAutoStart(ls: Lobbies, l: Lobby, now = Date.now()): void {
  if (!l.settings.public || l.match || !l.members.length) {
    clearTimeout(l.startTimer);
    l.startTimer = l.startsAt = undefined;
    return;
  }
  const n = l.members.length;
  const wait = n >= PROTOCOL_LIMITS.maxPlayers ? AUTO_START.fullMs : n >= 2 ? AUTO_START.groupMs : AUTO_START.aloneMs;
  const at = Math.min(l.startsAt ?? Infinity, now + wait);
  if (at === l.startsAt) return;
  clearTimeout(l.startTimer);
  l.startsAt = at;
  l.startTimer = setTimeout(() => fire(ls, l), at - now);
}

function fire(ls: Lobbies, l: Lobby): void {
  l.startTimer = l.startsAt = undefined;
  if (ls.byCode.get(l.code) !== l || l.match || !l.members.length) return;
  if (l.settings.ranked && l.members.length < 2) return scheduleAutoStart(ls, l); // ranked waits for an opponent
  beginMatch(ls, l);
}
