import type { OnlineChoice } from "./onlineMenu.ts";

const KEY = "re-tanx:rejoin";
/** How long after a match started we still offer "Rejoin" on the online menu (the server decides if the seat is really still there). */
const OFFER_MS = 15 * 60_000;

interface Saved { code: string; name: string; gang: OnlineChoice["gang"]; at: number }

/** Remember the running match so a page reload or crash can get back in. */
export function rememberRejoin(code: string, c: OnlineChoice): void {
  try {
    if (code) localStorage.setItem(KEY, JSON.stringify({ code, name: c.name, gang: c.gang, at: Date.now() } satisfies Saved));
  } catch {
    // storage blocked: in-page reconnect still works
  }
}

export function forgetRejoin(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing stored
  }
}

export function pendingRejoin(): OnlineChoice | undefined {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Saved | null;
    if (!s || typeof s.code !== "string" || Date.now() - s.at > OFFER_MS) return undefined;
    return { name: s.name, gang: s.gang, join: undefined, rejoin: s.code, until: Date.now() };
  } catch {
    return undefined;
  }
}
