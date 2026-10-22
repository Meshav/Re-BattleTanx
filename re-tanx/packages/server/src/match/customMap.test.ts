import { describe, expect, it } from "vitest";
import type { WebSocket } from "ws";
import { gangIds, playReplay, sanitizeSettings, type ServerMsg } from "@re-tanx/sim";
import { createMatch, runMatch, stopMatch } from "./match.ts";
import type { Client } from "../client.ts";

const rows = ["##############", "#S....#.....S#", "#..H..w..~...#", "#.....#......#", "#..##....##..#", "#...........R#", "#S..........S#", "##############"];

function fakeClient(id: number): Client & { sent: ServerMsg[] } {
  const sent: ServerMsg[] = [];
  const ws = { OPEN: 1, readyState: 1, send: (s: string) => sent.push(JSON.parse(s) as ServerMsg) } as unknown as WebSocket;
  return { id, ws, name: `P${id}`, gang: gangIds[0]!, lobby: undefined, inputTimes: [], ctrlTimes: [], profileId: undefined, profile: undefined, perks: [], sent };
}

describe("custom arenas online", () => {
  it("a valid player-made map survives sanitizing, reaches every player at start, and is inside the replay", () => {
    const s = sanitizeSettings({ customMap: { name: "Yard", rows }, map: "whatever" });
    expect(s.customMap?.id).toMatch(/^c-/);
    expect(s.map).toBe(s.customMap!.id);
    const a = fakeClient(1);
    const m = createMatch(s.customMap!, s, [a]);
    runMatch(m, s.customMap!.id, () => {});
    stopMatch(m);
    const start = a.sent.find((x) => x.t === "start");
    expect(start?.t === "start" && start.map?.rows).toEqual(rows);
    const replay = m.recorder.finish(m.world);
    expect(playReplay(JSON.parse(JSON.stringify(replay))).world.map.cols).toBe(rows[0]!.length);
  });

  it("a bad custom map falls back to a built-in arena", () => {
    const s = sanitizeSettings({ customMap: { name: "Bad", rows: ["S"] }, map: "neon" });
    expect(s.customMap).toBeUndefined();
    expect(s.map).toBe("neon");
  });
});
