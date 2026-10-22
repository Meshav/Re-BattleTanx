import { createServer, type Server } from "node:http";
import { WebSocketServer } from "ws";
import { PROTOCOL_LIMITS, gangIds } from "@re-tanx/sim";
import { send, type Client } from "./client.ts";
import { onMessage } from "./router.ts";
import { closeLobby, createLobbies, leaveLobby } from "./lobby/lobbies.ts";
import { randomBytes } from "node:crypto";
import { createTokens } from "./auth/guestToken.ts";
import { createFileStore, type ProfileStore } from "./persist/profileStore.ts";
import { createMariaStore } from "./persist/mariaStore.ts";
import { createOAuth, providersFromEnv, type Provider } from "./auth/oauth.ts";

export interface GameServer { http: Server; stop(): Promise<void> }

/** HTTP (health check) + WebSocket game server on one port. */
export interface ServerOptions { store?: ProfileStore; secret?: string; oauth?: { providers: Provider[]; publicUrl: string; fetch?: typeof fetch } }

export function startServer(port: number, opts: ServerOptions = {}): GameServer {
  const store = opts.store ?? createFileStore(process.env.DATA_DIR ?? "./data-store");
  const secret = opts.secret ?? process.env.SERVER_SECRET ?? warnRandomSecret();
  const tokens = createTokens(secret);
  const lobbies = createLobbies({ tokens, store });
  const oauth = createOAuth({ providers: [], publicUrl: "", ...opts.oauth, tokens, store });
  const http = createServer((req, res) => {
    if (oauth(req, res)) return;
    if (req.url === "/history") {
      // your own matches only: the bearer token says who you are
      const id = tokens.verify(/^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1]);
      if (!id) return void res.writeHead(401).end();
      store.history(id, 20).then((rows) => {
        res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
        res.end(JSON.stringify(rows));
      }, () => res.writeHead(500).end());
      return;
    }
    if (req.url === "/leaderboard") {
      store.leaderboard(20).then((rows) => {
        res.writeHead(200, { "content-type": "application/json", "cache-control": "max-age=30" });
        res.end(JSON.stringify(rows));
      }, () => res.writeHead(500).end());
      return;
    }
    const ok = req.url === "/health";
    res.writeHead(ok ? 200 : 404, { "content-type": "application/json" });
    res.end(ok ? JSON.stringify({ ok: true, lobbies: lobbies.byCode.size }) : "{}");
  });
  const wss = new WebSocketServer({ server: http, path: "/ws", maxPayload: PROTOCOL_LIMITS.maxMessageBytes });
  let nextId = 1;
  wss.on("connection", (ws) => {
    const client: Client = { id: nextId++, ws, name: "Tanker", gang: gangIds[0]!, lobby: undefined, inputTimes: [], ctrlTimes: [], profileId: undefined, profile: undefined, perks: [] };
    send(client, { t: "welcome", playerId: client.id });
    ws.on("message", (data) => onMessage(lobbies, client, data.toString()));
    ws.on("close", () => leaveLobby(lobbies, client, true)); // a dropped connection may come back
    ws.on("error", () => ws.close());
  });
  http.listen(port);
  const stop = () => new Promise<void>((resolve) => {
    for (const l of lobbies.byCode.values()) closeLobby(lobbies, l);
    for (const ws of wss.clients) ws.terminate();
    wss.close();
    http.close(() => void (store.close?.() ?? Promise.resolve()).then(() => resolve()));
  });
  for (const sig of ["SIGINT", "SIGTERM"] as const) process.once(sig, () => void stop().then(() => process.exit(0)));
  return { http, stop };
}

/** Without SERVER_SECRET, guest tokens stop working after a restart (players keep a new profile). */
function warnRandomSecret(): string {
  if (process.env.NODE_ENV !== "test" && !process.env.VITEST) console.warn("SERVER_SECRET not set: guest profiles won't survive a restart");
  return randomBytes(32).toString("hex");
}

if (process.argv[1]?.endsWith("main.ts")) {
  const env = process.env;
  const port = Number(env.PORT ?? 8787);
  const store = env.DATABASE_URL ? await createMariaStore(env.DATABASE_URL) : undefined;
  const providers = providersFromEnv(env);
  if (providers.length && !env.PUBLIC_URL) console.warn("sign-in providers configured but PUBLIC_URL is not set: sign-in is disabled");
  startServer(port, { ...(store ? { store } : {}), ...(providers.length && env.PUBLIC_URL ? { oauth: { providers, publicUrl: env.PUBLIC_URL.replace(/\/$/, "") } } : {}) });
  console.log(`re-tanx server on :${port} (ws path /ws) · store: ${store ? "MariaDB" : "files"} · sign-in: ${providers.map((p) => p.label).join(", ") || "off"}`);
}
