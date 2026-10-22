import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { WebSocket } from "ws";
import type { ServerMsg } from "@re-tanx/sim";
import { startServer, type GameServer } from "./main.ts";
import { createMemoryStore } from "./persist/profileStore.ts";

let server: GameServer;
let url = "";

beforeAll(async () => {
  server = startServer(0, { store: createMemoryStore(), secret: "test" });
  await new Promise<void>((r) => server.http.once("listening", () => r()));
  url = `ws://127.0.0.1:${(server.http.address() as AddressInfo).port}/ws`;
});
afterAll(() => server.stop());

interface TestClient { ws: WebSocket; msgs: ServerMsg[]; send(m: object): void; next(t: ServerMsg["t"], timeoutMs?: number): Promise<ServerMsg> }

async function connect(): Promise<TestClient> {
  const ws = new WebSocket(url);
  const msgs: ServerMsg[] = [];
  ws.on("message", (d) => msgs.push(JSON.parse(d.toString()) as ServerMsg));
  await new Promise((r) => ws.once("open", r));
  const client: TestClient = {
    ws, msgs,
    send: (m) => ws.send(JSON.stringify(m)),
    async next(t, timeoutMs = 2000) {
      const until = Date.now() + timeoutMs;
      while (Date.now() < until) {
        const i = msgs.findIndex((m) => m.t === t);
        if (i >= 0) return msgs.splice(0, i + 1).at(-1)!;
        await new Promise((r) => setTimeout(r, 10));
      }
      throw new Error(`timed out waiting for ${t}`);
    },
  };
  await client.next("welcome");
  return client;
}

describe("game server", () => {
  it("hosts a lobby, starts a match and streams snapshots that reflect your inputs", async () => {
    const host = await connect();
    const guest = await connect();
    host.send({ t: "hello", name: "Host", gang: "boneRiders" });
    host.send({ t: "create", settings: { mode: "deathmatch", scoreLimit: 7, bots: 1, difficulty: "easy", teams: "ffa", perks: false, map: "neon" } });
    const lobby = await host.next("lobby");
    if (lobby.t !== "lobby") throw new Error();
    guest.send({ t: "hello", name: "Guest", gang: "rustSaints" });
    guest.send({ t: "join", code: lobby.code });
    const joined = await guest.next("lobby");
    expect(joined.t === "lobby" && joined.members.map((m) => m.name)).toEqual(["Host", "Guest"]);

    guest.send({ t: "start" }); // not host: ignored
    host.send({ t: "start" });
    const start = await host.next("start");
    await guest.next("start");
    if (start.t !== "start") throw new Error();

    const first = await host.next("snap");
    if (first.t !== "snap") throw new Error();
    expect(first.snap.meta?.length).toBe(3);
    const startPos = first.snap.tanks.find((t) => t.id === start.tankId)!.pos;
    for (let seq = 1; seq <= 40; seq++) host.send({ t: "input", seq, input: { throttle: 1, steer: 0, aim: 0, fire: false, special: false, cycle: 0 } });
    await new Promise((r) => setTimeout(r, 900));
    const later = host.msgs.filter((m) => m.t === "snap").at(-1);
    if (!later || later.t !== "snap") throw new Error("no snapshots");
    const pos = later.snap.tanks.find((t) => t.id === start.tankId)!.pos;
    expect(Math.hypot(pos.x - startPos.x, pos.y - startPos.y)).toBeGreaterThan(3);
    expect(later.ack).toBeGreaterThan(10);

    guest.ws.close();
    await new Promise((r) => setTimeout(r, 150));
    host.msgs.length = 0;
    const snapAfterLeave = await host.next("snap");
    expect(snapAfterLeave.t === "snap" && snapAfterLeave.snap.bots.length).toBe(2); // guest's tank is now a bot
    host.ws.close();
  });

  it("rejects joining a lobby that doesn't exist", async () => {
    const c = await connect();
    c.send({ t: "join", code: "ZZZZZ" });
    const err = await c.next("error");
    expect(err.t === "error" && err.message).toContain("ZZZZZ");
    c.ws.close();
  });
});

describe("trust boundary", () => {
  it("a fresh guest can't take a locked gang", async () => {
    const c = await connect();
    c.send({ t: "hello", name: "Newbie", gang: "edgeborn" });
    c.send({ t: "create", settings: {} });
    const lobby = await c.next("lobby");
    if (lobby.t !== "lobby") throw new Error();
    expect(lobby.members[0]!.gang).toBe("ironHounds");
    c.ws.close();
  });

  it("drops control-message floods", async () => {
    const c = await connect();
    for (let i = 0; i < 60; i++) c.send({ t: "ping", at: i });
    await new Promise((r) => setTimeout(r, 300));
    expect(c.msgs.filter((m) => m.t === "pong").length).toBeLessThanOrEqual(20);
    c.ws.close();
  });
});

describe("rejoin", () => {
  async function soloMatch() {
    const c = await connect();
    c.send({ t: "hello", name: "Solo", gang: "ironHounds" });
    const id = await c.next("identity");
    c.send({ t: "create", settings: { mode: "deathmatch", bots: 1, map: "graybox" } });
    const lobby = await c.next("lobby");
    c.send({ t: "start" });
    const start = await c.next("start");
    if (id.t !== "identity" || lobby.t !== "lobby" || start.t !== "start") throw new Error();
    return { c, token: id.token, code: lobby.code, tankId: start.tankId };
  }

  it("a dropped player reconnects with their token and gets their own tank back from the bot", async () => {
    const { c, token, code, tankId } = await soloMatch();
    c.ws.close(); // wifi blinks: nobody left, but the match waits
    await new Promise((r) => setTimeout(r, 100));
    const back = await connect();
    back.send({ t: "hello", name: "Solo", gang: "ironHounds", token });
    back.send({ t: "rejoin", code });
    const start = await back.next("start");
    expect(start.t === "start" && start.tankId).toBe(tankId);
    const snap = await back.next("snap");
    expect(snap.t === "snap" && snap.snap.bots).not.toContain(tankId); // human again
    expect(snap.t === "snap" && snap.snap.meta?.length).toBeGreaterThan(0); // full snapshot
    back.ws.close();
  });

  it("someone else's token can't take the seat, and leaving on purpose gives it up", async () => {
    const { c, token, code } = await soloMatch();
    const stranger = await connect();
    stranger.send({ t: "hello", name: "Thief", gang: "ironHounds" });
    stranger.send({ t: "rejoin", code });
    expect((await stranger.next("error")).t).toBe("error");
    const other = await connect(); // keeps the lobby alive after the host leaves on purpose
    other.send({ t: "hello", name: "Other", gang: "ironHounds" });
    c.send({ t: "leave" });
    await new Promise((r) => setTimeout(r, 100));
    const back = await connect();
    back.send({ t: "hello", name: "Solo", gang: "ironHounds", token });
    back.send({ t: "rejoin", code });
    expect((await back.next("error")).t).toBe("error");
    for (const k of [c, stranger, other, back]) k.ws.close();
  });
});

describe("history endpoint", () => {
  it("needs your token and only ever shows your own matches", async () => {
    const base = url.replace("ws://", "http://").replace("/ws", "");
    expect((await fetch(`${base}/history`)).status).toBe(401);
    expect((await fetch(`${base}/history`, { headers: { authorization: "Bearer forged.token" } })).status).toBe(401);
    const c = await connect();
    c.send({ t: "hello", name: "Hist", gang: "ironHounds" });
    const id = await c.next("identity");
    if (id.t !== "identity") throw new Error();
    const res = await fetch(`${base}/history`, { headers: { authorization: `Bearer ${id.token}` } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    c.ws.close();
  });
});
