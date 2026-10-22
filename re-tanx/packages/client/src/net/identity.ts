import { serverUrl } from "./socket.ts";

const TOKEN_KEY = "re-tanx:token";
const PROVIDER_KEY = "re-tanx:signin";

const read = (k: string): string | undefined => {
  try {
    return localStorage.getItem(k) ?? undefined;
  } catch {
    return undefined;
  }
};
const write = (k: string, v: string): void => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // storage blocked: identity lasts this session only
  }
};

/** The signed player token the server issued (guest or signed-in). */
export const storedToken = (): string | undefined => read(TOKEN_KEY);
export const saveToken = (t: string): void => write(TOKEN_KEY, t);
/** Which provider this browser signed in with, if any. */
export const signedInWith = (): string | undefined => read(PROVIDER_KEY);

/** The game server's HTTP base (same host as the socket). */
export const serverHttp = (): string => serverUrl().replace(/^ws/, "http").replace(/\/ws$/, "");

export interface SignInProvider { id: string; label: string }

export async function fetchProviders(): Promise<SignInProvider[]> {
  try {
    const res = await fetch(`${serverHttp()}/auth/providers`);
    return res.ok ? ((await res.json()) as SignInProvider[]) : [];
  } catch {
    return [];
  }
}

/** Leave for the provider; the server links your current guest so progress carries over. */
export function startSignIn(provider: string): void {
  const token = storedToken();
  location.href = `${serverHttp()}/auth/${encodeURIComponent(provider)}/start${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

/** Back from the provider: `#signin=<token>&provider=x` or `#signin-error=reason`. Returns what happened and clears the hash. */
export function takeSignInResult(): { ok: true; provider: string } | { ok: false; error: string } | undefined {
  const h = new URLSearchParams(location.hash.slice(1));
  const token = h.get("signin"), error = h.get("signin-error");
  if (!token && !error) return undefined;
  history.replaceState(null, "", location.pathname + location.search);
  if (!token) return { ok: false, error: error === "expired" ? "Sign-in took too long, try again" : "Sign-in failed, try again" };
  saveToken(token);
  const provider = h.get("provider") ?? "account";
  write(PROVIDER_KEY, provider);
  return { ok: true, provider };
}

export interface LeaderRow { name: string; rating: number; games: number }

export async function fetchLeaderboard(): Promise<LeaderRow[] | undefined> {
  try {
    const res = await fetch(`${serverHttp()}/leaderboard`);
    return res.ok ? ((await res.json()) as LeaderRow[]) : undefined;
  } catch {
    return undefined;
  }
}

export interface HistoryRow { mode: string; mapId: string; endedAt: number; ranked: boolean; won: boolean; players: number; place: number; kills: number; deaths: number; xp: number; leftEarly: boolean; ratingDelta?: number }

/** Your recent online matches (the token proves who you are). undefined = server unreachable. */
export async function fetchHistory(): Promise<HistoryRow[] | undefined> {
  const token = storedToken();
  if (!token) return [];
  try {
    const res = await fetch(`${serverHttp()}/history`, { headers: { authorization: `Bearer ${token}` } });
    return res.ok ? ((await res.json()) as HistoryRow[]) : res.status === 401 ? [] : undefined;
  } catch {
    return undefined;
  }
}
