import type { InputState } from "../input.ts";
import type { ClientMsg, LobbySettings } from "./protocol.ts";
import { PROTOCOL_LIMITS } from "./protocol.ts";
import { gangIds, type GangId } from "../data/gangDefs.ts";
import { difficulties } from "../data/aiDefs.ts";
import { modeKinds } from "../modes/registry.ts";
import { versusMaps } from "../data/maps.ts";
import { checkMap } from "../data/mapCheck.ts";
import { clamp } from "../math/clamp.ts";
import { quantizeInput } from "../replay/replay.ts";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null;
const num = (v: unknown, lo: number, hi: number, dflt = 0) => (typeof v === "number" && Number.isFinite(v) ? clamp(v, lo, hi) : dflt);
const gang = (v: unknown): GangId => (gangIds.includes(v as GangId) ? (v as GangId) : gangIds[0]!);

/** Trust boundary: anything a client sends is clamped into range or rejected. */
export function sanitizeInput(v: unknown): InputState {
  const o = isObj(v) ? v : {};
  // quantized like replays store it, so the server's match can be re-simulated exactly
  return quantizeInput({
    throttle: num(o.throttle, -1, 1), steer: num(o.steer, -1, 1), strafe: num(o.strafe, -1, 1), aim: num(o.aim, -1e3, 1e3),
    fire: o.fire === true, special: o.special === true, cycle: Math.sign(num(o.cycle, -1, 1)),
  });
}

/** Ranked is humans-only free-for-all, perks off, in modes where you finish in a clear order. */
export const RANKED_MODES = ["deathmatch", "tankWars", "lastGang", "annihilation"] as const;

export function sanitizeSettings(v: unknown): LobbySettings {
  const o = isObj(v) ? v : {};
  const s = baseSettings(o);
  if (!s.ranked) return s;
  return { ...s, bots: 0, perks: false, teams: "ffa", mode: (RANKED_MODES as readonly string[]).includes(s.mode) ? s.mode : "deathmatch" };
}

function baseSettings(o: Obj): LobbySettings {
  const custom = o.customMap === undefined ? undefined : checkMap(o.customMap).map;
  return {
    mode: modeKinds.includes(o.mode as never) ? (o.mode as LobbySettings["mode"]) : "deathmatch",
    scoreLimit: Math.round(num(o.scoreLimit, 0, 300, 0)), // 0 = the mode's default
    bots: Math.round(num(o.bots, 0, 7, 2)),
    difficulty: difficulties.includes(o.difficulty as never) ? (o.difficulty as LobbySettings["difficulty"]) : "normal",
    teams: o.teams === "coop" ? "coop" : "ffa",
    perks: o.perks === true,
    map: custom?.id ?? (versusMaps.some((m) => m.id === o.map) ? (o.map as string) : versusMaps[0]!.id),
    ranked: o.ranked === true,
    public: o.public === true,
    ...(custom ? { customMap: custom } : {}),
  };
}

const cleanName = (v: unknown) => (typeof v === "string" ? v.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, PROTOCOL_LIMITS.maxNameLength) : "") || "Tanker";

/** Parse one raw socket message into a typed, sanitized ClientMsg (or undefined if junk). */
export function parseClientMsg(raw: string): ClientMsg | undefined {
  if (raw.length > PROTOCOL_LIMITS.maxMessageBytes) return undefined;
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isObj(o) || typeof o.t !== "string") return undefined;
  switch (o.t) {
    case "hello": return { t: "hello", name: cleanName(o.name), gang: gang(o.gang), ...(typeof o.token === "string" ? { token: o.token.slice(0, 80) } : {}), ...(Array.isArray(o.perks) ? { perks: o.perks.slice(0, 3) as never } : {}) };
    case "create": return { t: "create", settings: sanitizeSettings(o.settings) };
    case "join": case "rejoin": return typeof o.code === "string" ? { t: o.t, code: o.code.toUpperCase().slice(0, PROTOCOL_LIMITS.codeLength) } : undefined;
    case "settings": return { t: "settings", settings: sanitizeSettings(o.settings) };
    case "gang": return { t: "gang", gang: gang(o.gang) };
    case "start": case "leave": case "quick": return { t: o.t };
    case "input": return { t: "input", seq: Math.round(num(o.seq, 0, 2 ** 31)), input: sanitizeInput(o.input), ...(typeof o.view === "number" ? { view: Math.round(num(o.view, 0, 2 ** 31)) } : {}) };
    case "ping": return { t: "ping", at: num(o.at, 0, Number.MAX_SAFE_INTEGER) };
    default: return undefined;
  }
}
