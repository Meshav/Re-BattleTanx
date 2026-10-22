import type { IncomingMessage, ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import type { Tokens } from "./guestToken.ts";
import type { ProfileStore } from "../persist/profileStore.ts";

/**
 * "Sign in with Discord / Google" (authorization-code flow). The account links to the guest you were
 * playing as, so progress carries over; later sign-ins on any device resume that same player.
 */
export interface Provider {
  id: string; label: string; clientId: string; clientSecret: string;
  authorizeUrl: string; tokenUrl: string; userUrl: string; scope: string;
}

const PRESETS: Record<string, Omit<Provider, "clientId" | "clientSecret">> = {
  discord: { id: "discord", label: "Discord", authorizeUrl: "https://discord.com/oauth2/authorize", tokenUrl: "https://discord.com/api/oauth2/token", userUrl: "https://discord.com/api/users/@me", scope: "identify" },
  google: { id: "google", label: "Google", authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth", tokenUrl: "https://oauth2.googleapis.com/token", userUrl: "https://openidconnect.googleapis.com/v1/userinfo", scope: "openid" },
};

/** Providers with credentials in the environment (DISCORD_CLIENT_ID/SECRET, GOOGLE_CLIENT_ID/SECRET). */
export function providersFromEnv(env: NodeJS.ProcessEnv): Provider[] {
  return Object.values(PRESETS).flatMap((p) => {
    const key = p.id.toUpperCase();
    const clientId = env[`${key}_CLIENT_ID`], clientSecret = env[`${key}_CLIENT_SECRET`];
    return clientId && clientSecret ? [{ ...p, clientId, clientSecret }] : [];
  });
}

export interface OAuthDeps {
  providers: Provider[];
  /** where the game is served, e.g. https://tanks.example.com — callbacks and the final redirect go here */
  publicUrl: string;
  tokens: Tokens;
  store: ProfileStore;
  fetch?: typeof fetch;
}

const STATE_TTL_MS = 10 * 60_000;
const MAX_PENDING = 1000;

/** Returns a request handler for /auth/*; false = not an auth route. */
export function createOAuth(deps: OAuthDeps): (req: IncomingMessage, res: ServerResponse) => boolean {
  const pending = new Map<string, { provider: string; guestId: string | undefined; expires: number }>();
  const doFetch = deps.fetch ?? fetch;
  const callbackUrl = (p: Provider) => `${deps.publicUrl}/auth/${p.id}/callback`;
  const back = (res: ServerResponse, hash: string) => {
    res.writeHead(302, { location: `${deps.publicUrl}/#${hash}` });
    res.end();
  };

  async function callback(p: Provider, url: URL, res: ServerResponse): Promise<void> {
    const state = pending.get(url.searchParams.get("state") ?? "");
    pending.delete(url.searchParams.get("state") ?? "");
    const code = url.searchParams.get("code");
    if (!state || state.provider !== p.id || state.expires < Date.now() || !code) return back(res, "signin-error=expired");
    const tok = await doFetch(p.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams({ client_id: p.clientId, client_secret: p.clientSecret, grant_type: "authorization_code", code, redirect_uri: callbackUrl(p) }),
    });
    const access = ((await tok.json()) as { access_token?: unknown }).access_token;
    if (!tok.ok || typeof access !== "string") return back(res, "signin-error=provider");
    const me = await doFetch(p.userUrl, { headers: { authorization: `Bearer ${access}` } });
    const user = (await me.json()) as { id?: unknown; sub?: unknown };
    const subject = String(user.id ?? user.sub ?? "");
    if (!me.ok || !/^[\w-]{1,64}$/.test(subject)) return back(res, "signin-error=provider");
    let playerId = await deps.store.findIdentity(p.id, subject);
    if (!playerId) {
      playerId = state.guestId ?? deps.tokens.issue().id; // first sign-in: keep the guest's progress
      await deps.store.linkIdentity(p.id, subject, playerId);
    }
    back(res, `signin=${encodeURIComponent(deps.tokens.issueFor(playerId))}&provider=${p.id}`);
  }

  return (req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    const parts = url.pathname.split("/").filter(Boolean); // auth, <provider>, start|callback
    if (parts[0] !== "auth") return false;
    if (parts[1] === "providers" && parts.length === 2) {
      res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
      res.end(JSON.stringify(deps.providers.map((p) => ({ id: p.id, label: p.label }))));
      return true;
    }
    const p = deps.providers.find((k) => k.id === parts[1]);
    if (!p || parts.length !== 3) {
      res.writeHead(404).end();
      return true;
    }
    if (parts[2] === "start") {
      const now = Date.now();
      for (const [k, v] of pending) if (v.expires < now) pending.delete(k);
      if (pending.size >= MAX_PENDING) {
        res.writeHead(503).end();
        return true;
      }
      const state = randomBytes(18).toString("base64url");
      pending.set(state, { provider: p.id, guestId: deps.tokens.verify(url.searchParams.get("token") ?? undefined), expires: now + STATE_TTL_MS });
      const q = new URLSearchParams({ client_id: p.clientId, redirect_uri: callbackUrl(p), response_type: "code", scope: p.scope, state });
      res.writeHead(302, { location: `${p.authorizeUrl}?${q}` });
      res.end();
      return true;
    }
    if (parts[2] === "callback") {
      callback(p, url, res).catch((e: unknown) => {
        console.error("sign-in failed", e);
        back(res, "signin-error=server");
      });
      return true;
    }
    res.writeHead(404).end();
    return true;
  };
}
