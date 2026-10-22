import { describe, expect, it } from "vitest";
import type { WebSocket } from "ws";
import { gangIds, playReplay, sanitizeInput, type MapJson, type ServerMsg } from "@re-tanx/sim";
import mapJson from "../../../../data/maps/neon.json" with { type: "json" };
import { createMatch, dropSeat, stopMatch, tick } from "./match.ts";
import { pushInput } from "./inputs.ts";
import type { Client } from "../client.ts";

function fakeClient(id: number): Client & { sent: ServerMsg[] } {
  const sent: ServerMsg[] = [];
  const ws = { OPEN: 1, readyState: 1, send: (s: string) => sent.push(JSON.parse(s) as ServerMsg) } as unknown as WebSocket;
  return { id, ws, name: `P${id}`, gang: gangIds[0]!, lobby: undefined, inputTimes: [], ctrlTimes: [], profileId: undefined, profile: undefined, perks: [], sent };
}

describe("online replays", () => {
  it("the server records the match (including a player dropping out) and hands every player a replay that re-simulates exactly", () => {
    const [a, b] = [fakeClient(1), fakeClient(2)];
    const m = createMatch(mapJson as MapJson, { mode: "deathmatch", scoreLimit: 1, bots: 3, difficulty: "hard", teams: "ffa", perks: false, map: "neon", ranked: false, public: false }, [a, b]);
    for (let t = 1; t < 30 * 180 && !m.world.mode.over; t++) {
      pushInput(m.seats[0]!.queue, t, sanitizeInput({ throttle: 1, steer: Math.sin(t / 30), strafe: 0, aim: t / 50, fire: t % 9 === 0, special: false, cycle: 0 }));
      if (t < 20) pushInput(m.seats[1]!.queue, t, { throttle: -0.5, steer: 0.3, strafe: 0, aim: 0, fire: true, special: false, cycle: 0 });
      if (t === 20) dropSeat(m, b);
      tick(m, () => {}, () => {});
    }
    stopMatch(m);
    expect(m.world.mode.over).toBe(true);
    const msg = a.sent.find((s) => s.t === "replay");
    if (msg?.t !== "replay") throw new Error("no replay sent");
    expect(msg.replay.actions).toEqual([[19, 1, "bot"]]);
    const pb = playReplay(JSON.parse(JSON.stringify(msg.replay)));
    while (!pb.world.mode.over) pb.step();
    expect(pb.world.tick).toBe(m.world.tick);
    expect(pb.world.tanks.map((t) => [t.pos.x, t.pos.y, t.kills])).toEqual(m.world.tanks.map((t) => [t.pos.x, t.pos.y, t.kills]));
  });
});
