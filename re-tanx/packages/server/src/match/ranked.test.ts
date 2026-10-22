import { describe, expect, it } from "vitest";
import type { WebSocket } from "ws";
import { gangIds, sanitizeSettings, type MapJson, type ServerMsg } from "@re-tanx/sim";
import mapJson from "../../../../data/maps/graybox.json" with { type: "json" };
import { createMatch, dropSeat } from "./match.ts";
import { awardMatch, placements } from "./awards.ts";
import { createMemoryStore } from "../persist/profileStore.ts";
import { createTokens } from "../auth/guestToken.ts";
import type { Client } from "../client.ts";

function fakeClient(id: number): Client & { sent: ServerMsg[] } {
  const sent: ServerMsg[] = [];
  const ws = { OPEN: 1, readyState: 1, send: (s: string) => sent.push(JSON.parse(s) as ServerMsg) } as unknown as WebSocket;
  return { id, ws, name: `P${id}`, gang: gangIds[0]!, lobby: undefined, inputTimes: [], ctrlTimes: [], profileId: `pid${id}`, profile: undefined, perks: [], sent };
}

const ranked = sanitizeSettings({ mode: "battlelord", bots: 5, perks: true, teams: "coop", ranked: true, map: "graybox" });

describe("ranked", () => {
  it("lobby settings: humans-only FFA, perks off, a placement mode", () => {
    expect(ranked).toMatchObject({ ranked: true, bots: 0, perks: false, teams: "ffa", mode: "deathmatch" });
  });

  it("rates by finishing order; quitters count as last; leaderboard ranks them", async () => {
    const store = createMemoryStore();
    const [a, b, c] = [fakeClient(1), fakeClient(2), fakeClient(3)];
    const m = createMatch(mapJson as MapJson, ranked, [a, b, c]);
    const [ta, tb] = [m.world.tanks[0]!, m.world.tanks[1]!];
    m.world.mode.scores[ta.team] = 7;
    m.world.mode.scores[tb.team] = 3;
    dropSeat(m, c);
    expect(placements(m, m.world)).toEqual([0, 1, 2]);
    await awardMatch(m, m.world, { tokens: createTokens("t"), store });
    const [pa, pb, pc] = await Promise.all(["pid1", "pid2", "pid3"].map((id) => store.get(id)));
    expect(pa!.rating!.r).toBeGreaterThan(1500);
    expect(pc!.rating!.r).toBeLessThan(pb!.rating!.r);
    expect(pc!.totals.matches).toBe(0); // no XP for leaving
    const msg = a.sent.find((s) => s.t === "progress");
    expect(msg?.t === "progress" && msg.result.rating!.after).toBeGreaterThan(msg?.t === "progress" ? msg.result.rating!.before : 0);
    const board = await store.leaderboard(10);
    expect(board.map((r) => r.name)).toEqual(["P1", "P2", "P3"]);
    const [h1] = await store.history("pid1", 5);
    expect(h1).toMatchObject({ mode: "deathmatch", ranked: true, place: 0, leftEarly: false });
    expect(h1!.ratingDelta).toBeGreaterThan(0);
    expect((await store.history("pid3", 5))[0]).toMatchObject({ leftEarly: true, xp: 0 });
  });

  it("unranked matches leave ratings alone", async () => {
    const store = createMemoryStore();
    const [a, b] = [fakeClient(1), fakeClient(2)];
    const m = createMatch(mapJson as MapJson, { ...ranked, ranked: false }, [a, b]);
    await awardMatch(m, m.world, { tokens: createTokens("t"), store });
    expect((await store.get("pid1")).rating).toBeUndefined();
    expect(await store.leaderboard(10)).toEqual([]);
  });
});
