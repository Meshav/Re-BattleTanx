import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WebSocket } from "ws";
import { gangIds, sanitizeSettings, type ServerMsg } from "@re-tanx/sim";
import { closeLobby, createLobbies, createLobby, type Lobbies } from "./lobbies.ts";
import { AUTO_START, quickMatch } from "./quickMatch.ts";
import { createMemoryStore } from "../persist/profileStore.ts";
import { createTokens } from "../auth/guestToken.ts";
import type { Client } from "../client.ts";

function fakeClient(id: number): Client & { sent: ServerMsg[] } {
  const sent: ServerMsg[] = [];
  const ws = { OPEN: 1, readyState: 1, send: (s: string) => sent.push(JSON.parse(s) as ServerMsg) } as unknown as WebSocket;
  return { id, ws, name: `P${id}`, gang: gangIds[0]!, lobby: undefined, inputTimes: [], ctrlTimes: [], profileId: undefined, profile: undefined, perks: [], sent };
}

let ls: Lobbies;
beforeEach(() => {
  vi.useFakeTimers();
  ls = createLobbies({ tokens: createTokens("t"), store: createMemoryStore() });
});
afterEach(() => {
  for (const l of ls.byCode.values()) closeLobby(ls, l);
  vi.useRealTimers();
});

const started = (c: { sent: ServerMsg[] }) => c.sent.some((m) => m.t === "start");

describe("quick match", () => {
  it("opens a public lobby when none is waiting, then fills it before opening another", () => {
    const [a, b] = [fakeClient(1), fakeClient(2)];
    quickMatch(ls, a);
    quickMatch(ls, b);
    expect(ls.byCode.size).toBe(1);
    expect(a.lobby).toBe(b.lobby);
    expect([...ls.byCode.values()][0]!.settings.public).toBe(true);
  });

  it("never drops you into a private lobby or one that's already playing", () => {
    const host = fakeClient(1);
    createLobby(ls, host, sanitizeSettings({ map: "neon" })); // private
    const q = fakeClient(2);
    quickMatch(ls, q);
    expect(q.lobby).not.toBe(host.lobby);
  });

  it("a lone player starts with bots after a short wait; a second player brings the start forward", () => {
    const a = fakeClient(1);
    quickMatch(ls, a);
    vi.advanceTimersByTime(1000);
    const b = fakeClient(2);
    quickMatch(ls, b);
    const lobbyMsg = b.sent.filter((m) => m.t === "lobby").at(-1);
    expect(lobbyMsg?.t === "lobby" && lobbyMsg.startsIn).toBe(AUTO_START.groupMs / 1000);
    vi.advanceTimersByTime(AUTO_START.groupMs - 500);
    expect(started(a)).toBe(false);
    vi.advanceTimersByTime(600); // 16 s in: well before the 30 s a lone player would wait
    expect(started(a) && started(b)).toBe(true);
  });

  it("alone, it still starts (bots fill in)", () => {
    const a = fakeClient(1);
    quickMatch(ls, a);
    vi.advanceTimersByTime(AUTO_START.aloneMs + 10);
    expect(started(a)).toBe(true);
  });

  it("ranked public lobbies wait for an opponent", () => {
    const a = fakeClient(1);
    createLobby(ls, a, sanitizeSettings({ public: true, ranked: true }));
    vi.advanceTimersByTime(AUTO_START.aloneMs + 100);
    expect(started(a)).toBe(false);
    quickMatch(ls, fakeClient(2));
    vi.advanceTimersByTime(AUTO_START.aloneMs + 100);
    expect(started(a)).toBe(true);
  });
});
