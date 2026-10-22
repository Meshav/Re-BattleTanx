import { appendFileSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { displayRating, newProfile, sanitizeProfile, type Profile } from "@re-tanx/sim";

/** Player persistence. Async so a database can sit behind it; `update` is atomic per player (no lost XP when two matches end together). */
export interface ProfileStore {
  get(id: string): Promise<Profile>;
  update(id: string, fn: (p: Profile) => Profile): Promise<Profile>;
  /** player id an OAuth account signs in as */
  findIdentity(provider: string, subject: string): Promise<string | undefined>;
  linkIdentity(provider: string, subject: string, playerId: string): Promise<void>;
  /** rated players, best first by conservative rating */
  leaderboard(limit: number): Promise<LeaderRow[]>;
  /** one finished online match (humans only; bots are counted) */
  recordMatch(m: MatchRecord): Promise<void>;
  /** a player's most recent matches, newest first */
  history(playerId: string, limit: number): Promise<HistoryRow[]>;
  close?(): Promise<void>;
}

export interface LeaderRow { name: string; rating: number; games: number }

export interface MatchPlayer { playerId: string; name: string; team: number; gang: string | undefined; kills: number; deaths: number; xp: number; place: number; leftEarly: boolean; ratingDelta: number | undefined }
export interface MatchRecord { mode: string; mapId: string; startedAt: number; endedAt: number; winnerTeam: number | undefined; ranked: boolean; bots: number; players: MatchPlayer[] }
/** One line of someone's history: the match plus how they did. */
export interface HistoryRow { mode: string; mapId: string; endedAt: number; ranked: boolean; won: boolean; players: number; place: number; kills: number; deaths: number; xp: number; leftEarly: boolean; ratingDelta: number | undefined }

export function historyRow(m: MatchRecord, p: MatchPlayer): HistoryRow {
  return { mode: m.mode, mapId: m.mapId, endedAt: m.endedAt, ranked: m.ranked, won: m.winnerTeam === p.team, players: m.players.length + m.bots,
    place: p.place, kills: p.kills, deaths: p.deaths, xp: p.xp, leftEarly: p.leftEarly, ratingDelta: p.ratingDelta };
}

/** Shared ranking for stores that rank in memory. */
export function rankProfiles(profiles: Profile[], limit: number): LeaderRow[] {
  return profiles.flatMap((p) => (p.rating ? [{ name: p.name ?? "Tanker", rating: displayRating(p.rating), games: p.rating.games }] : []))
    .sort((a, b) => b.rating - a.rating).slice(0, limit);
}

/** One JSON file per player under DATA_DIR, written atomically (temp file + rename) so a crash can't leave half a profile. */
export function createFileStore(dir: string): ProfileStore {
  mkdirSync(dir, { recursive: true });
  const path = (id: string) => join(dir, `${id}.json`);
  const idsPath = join(dir, "identities.json");
  const write = (file: string, data: unknown) => {
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(data));
    renameSync(tmp, file);
  };
  const read = (id: string): Profile => {
    try {
      return sanitizeProfile(JSON.parse(readFileSync(path(id), "utf8")));
    } catch {
      return newProfile();
    }
  };
  const identities = (): Record<string, string> => {
    try {
      return JSON.parse(readFileSync(idsPath, "utf8")) as Record<string, string>;
    } catch {
      return {};
    }
  };
  // sync file I/O inside each call: nothing interleaves, so update() is atomic in this process
  return {
    get: async (id) => read(id),
    async update(id, fn) {
      const next = fn(read(id));
      write(path(id), next);
      return next;
    },
    findIdentity: async (provider, subject) => identities()[`${provider}:${subject}`],
    recordMatch: async (m) => appendFileSync(join(dir, "matches.jsonl"), `${JSON.stringify(m)}\n`),
    // shortcut: scans the whole log per call; fine for a homelab, use MariaDB beyond a few thousand matches
    async history(playerId, limit) {
      let lines: string[] = [];
      try {
        lines = readFileSync(join(dir, "matches.jsonl"), "utf8").split("\n").filter(Boolean);
      } catch {
        return [];
      }
      return lines.reverse().flatMap((l) => {
        const m = JSON.parse(l) as MatchRecord;
        const p = m.players.find((k) => k.playerId === playerId);
        return p ? [historyRow(m, p)] : [];
      }).slice(0, limit);
    },
    // shortcut: reads every profile file per call; fine for a homelab's worth of players, MariaDB for more
    leaderboard: async (limit) => rankProfiles(readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "identities.json").map((f) => read(f.slice(0, -5))), limit),
    async linkIdentity(provider, subject, playerId) {
      const ids = identities();
      ids[`${provider}:${subject}`] ??= playerId; // first link wins
      write(idsPath, ids);
    },
  };
}

/** For tests. */
export function createMemoryStore(): ProfileStore {
  const m = new Map<string, Profile>();
  const ids = new Map<string, string>();
  const matches: MatchRecord[] = [];
  const clone = (p: Profile): Profile => JSON.parse(JSON.stringify(p)) as Profile;
  return {
    get: async (id) => clone(m.get(id) ?? newProfile()),
    async update(id, fn) {
      const next = fn(clone(m.get(id) ?? newProfile()));
      m.set(id, clone(next));
      return next;
    },
    findIdentity: async (provider, subject) => ids.get(`${provider}:${subject}`),
    leaderboard: async (limit) => rankProfiles([...m.values()], limit),
    recordMatch: async (rec) => void matches.push(rec),
    history: async (playerId, limit) => matches.flatMap((rec) => rec.players.filter((p) => p.playerId === playerId).map((p) => historyRow(rec, p))).reverse().slice(0, limit),
    linkIdentity: async (provider, subject, playerId) => void (ids.has(`${provider}:${subject}`) || ids.set(`${provider}:${subject}`, playerId)),
  };
}
