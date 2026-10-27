import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WebSocket } from "ws";
import { gangIds, sanitizeSettings, type ServerMsg } from "@re-tanx/sim";
import { closeLobby, createLobbies, createLobby, startLobby, type Lobbies } from "../lobby/lobbies.ts";
import { onMessage } from "../router.ts";
import { tick } from "./match.ts";
import { createMemoryStore } from "../persist/profileStore.ts";
import { createTokens } from "../auth/guestToken.ts";
import type { Client } from "../client.ts";

function fakeClient(id: number): Client & { sent: ServerMsg[] } {
  const sent: ServerMsg[] = [];
  const ws = { OPEN: 1, readyState: 1, send: (s: string) => sent.push(JSON.parse(s) as ServerMsg) } as unknown as WebSocket;
  return { id, ws, name: `P${id}`, gang: gangIds[0]!, lobby: undefined, inputTimes: [], ctrlTimes: [], profileId: undefined, profile: undefined, perks: [], sent };
}

let ls: Lobbies;
beforeEach(() => { vi.useFakeTimers(); ls = createLobbies({ tokens: createTokens("t"), store: createMemoryStore() }); });
afterEach(() => { for (const l of ls.byCode.values()) closeLobby(ls, l); vi.useRealTimers(); });

function running(isPublic: boolean) {
  const c = fakeClient(1);
  createLobby(ls, c, sanitizeSettings({ map: "neon", public: isPublic }));
  const l = ls.byCode.get(c.lobby!)!;
  startLobby(ls, c);
  return { c, m: l.match! };
}

describe("pause", () => {
  it("a private match freezes for everyone until someone resumes", () => {
    const { c, m } = running(false);
    onMessage(ls, c, JSON.stringify({ t: "pause", on: true }));
    expect(c.sent.at(-1)).toEqual({ t: "paused", on: true, by: "P1" });
    const t0 = m.world.tick;
    tick(m, () => {}, () => {});
    expect(m.world.tick).toBe(t0);
    onMessage(ls, c, JSON.stringify({ t: "pause", on: false }));
    tick(m, () => {}, () => {});
    expect(m.world.tick).toBe(t0 + 1);
  });

  it("public matches ignore pause requests", () => {
    const { c, m } = running(true);
    onMessage(ls, c, JSON.stringify({ t: "pause", on: true }));
    expect(m.paused).toBe(false);
  });
});
