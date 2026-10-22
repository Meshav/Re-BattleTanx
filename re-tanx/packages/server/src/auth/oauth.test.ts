import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { startServer, type GameServer } from "../main.ts";
import { createMemoryStore } from "../persist/profileStore.ts";
import { createTokens } from "./guestToken.ts";

// a fake provider: any code is good, every code maps to the same account
const fakeFetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.endsWith("/token")) {
    const body = new URLSearchParams(String(init?.body));
    const ok = body.get("client_secret") === "shh" && body.get("code") === "good";
    return new Response(JSON.stringify(ok ? { access_token: "at-1" } : { error: "invalid_grant" }), { status: ok ? 200 : 400 });
  }
  if (u.endsWith("/me")) return new Response(JSON.stringify({ id: "424242" }), { status: 200 });
  return new Response("", { status: 404 });
}) as typeof fetch;

let server: GameServer;
let base = "";
const tokens = createTokens("test");

beforeAll(async () => {
  server = startServer(0, {
    store: createMemoryStore(), secret: "test",
    oauth: {
      publicUrl: "https://game.example", fetch: fakeFetch,
      providers: [{ id: "discord", label: "Discord", clientId: "cid", clientSecret: "shh", authorizeUrl: "https://p.example/authorize", tokenUrl: "https://p.example/token", userUrl: "https://p.example/me", scope: "identify" }],
    },
  });
  await new Promise<void>((r) => server.http.once("listening", () => r()));
  base = `http://127.0.0.1:${(server.http.address() as AddressInfo).port}`;
});
afterAll(() => server.stop());

const get = (path: string) => fetch(`${base}${path}`, { redirect: "manual" });

async function signIn(guestToken: string | undefined, code = "good"): Promise<string> {
  const start = await get(`/auth/discord/start${guestToken ? `?token=${encodeURIComponent(guestToken)}` : ""}`);
  expect(start.status).toBe(302);
  const to = new URL(start.headers.get("location")!);
  expect(to.origin + to.pathname).toBe("https://p.example/authorize");
  expect(to.searchParams.get("redirect_uri")).toBe("https://game.example/auth/discord/callback");
  const cb = await get(`/auth/discord/callback?code=${code}&state=${to.searchParams.get("state")}`);
  expect(cb.status).toBe(302);
  return cb.headers.get("location")!;
}

describe("sign-in", () => {
  it("lists configured providers", async () => {
    expect(await (await get("/auth/providers")).json()).toEqual([{ id: "discord", label: "Discord" }]);
  });

  it("first sign-in links the guest you were playing as; later sign-ins (any device) resume that player", async () => {
    const guest = tokens.issue();
    const first = await signIn(guest.token);
    const token = decodeURIComponent(/signin=([^&]+)/.exec(first)![1]!);
    expect(tokens.verify(token)).toBe(guest.id);
    const again = await signIn(undefined);
    expect(tokens.verify(decodeURIComponent(/signin=([^&]+)/.exec(again)![1]!))).toBe(guest.id);
  });

  it("rejects replayed or forged state and failed code exchanges", async () => {
    expect((await get("/auth/discord/callback?code=good&state=forged")).headers.get("location")).toContain("signin-error=expired");
    expect(await signIn(undefined, "bad")).toContain("signin-error=provider");
    expect((await get("/auth/nope/start")).status).toBe(404);
  });
});
