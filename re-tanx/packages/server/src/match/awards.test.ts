import { describe, expect, it } from "vitest";
import type { WebSocket } from "ws";
import { gangIds, type MapJson, type ServerMsg } from "@re-tanx/sim";
import mapJson from "../../../../data/maps/graybox.json" with { type: "json" };
import { createMatch } from "./match.ts";
import { awardMatch } from "./awards.ts";
import { createMemoryStore } from "../persist/profileStore.ts";
import { createTokens } from "../auth/guestToken.ts";
import type { Client } from "../client.ts";

function fakeClient(id: number, profileId: string): Client & { sent: ServerMsg[] } {
  const sent: ServerMsg[] = [];
  const ws = { OPEN: 1, readyState: 1, send: (s: string) => sent.push(JSON.parse(s) as ServerMsg) } as unknown as WebSocket;
  return { id, ws, name: `P${id}`, gang: gangIds[0]!, lobby: undefined, inputTimes: [], ctrlTimes: [], profileId, profile: undefined, perks: [], sent };
}

describe("server XP", () => {
  it("saves each player's award and tells them", async () => {
    const store = createMemoryStore();
    const [a, b] = [fakeClient(1, "alice"), fakeClient(2, "bob")];
    const m = createMatch(mapJson as MapJson, { mode: "deathmatch", scoreLimit: 7, bots: 0, difficulty: "easy", teams: "ffa", perks: false, map: "graybox", ranked: false, public: false }, [a, b]);
    m.world.stats[m.seats[0]!.tankId] = { kills: 7, deaths: 0, structures: 3, specials: 0, pickups: 0, queens: 0, damage: 0, killsByKind: { m1: 7 }, weaponXp: {} };
    Object.assign(m.world.mode, { over: true, winner: m.world.tanks[0]!.team });
    await awardMatch(m, m.world, { tokens: createTokens("t"), store });
    expect((await store.get("alice")).totals).toMatchObject({ matches: 1, wins: 1, kills: 7 });
    expect((await store.get("bob")).totals).toMatchObject({ matches: 1, wins: 0 });
    const msg = a.sent.find((s) => s.t === "progress");
    expect(msg?.t === "progress" && msg.result.award.total).toBeGreaterThan(500);
  });
});

describe("guest tokens", () => {
  it("verify their own tokens and reject forgeries", () => {
    const t = createTokens("secret");
    const { id, token } = t.issue();
    expect(t.verify(token)).toBe(id);
    expect(t.verify(`${id}.forged`)).toBeUndefined();
    expect(createTokens("other").verify(token)).toBeUndefined();
    expect(t.verify(42)).toBeUndefined();
  });
});
