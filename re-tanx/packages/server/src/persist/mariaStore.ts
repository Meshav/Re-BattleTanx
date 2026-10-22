import { readFileSync } from "node:fs";
import { createPool, type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { newProfile, sanitizeProfile, type Profile } from "@re-tanx/sim";
import { rankProfiles, type ProfileStore } from "./profileStore.ts";

const SCHEMA = new URL("../../../../sql/schema.sql", import.meta.url);

/** Run sql/schema.sql (every statement is CREATE ... IF NOT EXISTS, so this is safe on every boot). */
async function migrate(pool: Pool): Promise<void> {
  const sql = readFileSync(SCHEMA, "utf8").replace(/--.*$/gm, "");
  for (const stmt of sql.split(";").map((s) => s.trim()).filter(Boolean)) await pool.query(stmt);
}

const parse = (raw: unknown): Profile => {
  try {
    return sanitizeProfile(typeof raw === "string" ? JSON.parse(raw) : raw);
  } catch {
    return newProfile();
  }
};

/** MariaDB-backed store (DATABASE_URL=mysql://user:pass@host:3306/db). */
export async function createMariaStore(url: string): Promise<ProfileStore> {
  const pool = createPool({ uri: url, connectionLimit: 8 });
  await migrate(pool);
  return {
    async get(id) {
      const [rows] = await pool.query<RowDataPacket[]>("SELECT profile FROM players WHERE id = ?", [id]);
      return rows[0] ? parse(rows[0].profile) : newProfile();
    },
    async update(id, fn) {
      // row exists before the locking transaction, so concurrent first-time updates queue on the row lock instead of deadlocking on a gap lock
      await pool.query("INSERT IGNORE INTO players (id, profile) VALUES (?, ?)", [id, JSON.stringify(newProfile())]);
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [rows] = await conn.query<RowDataPacket[]>("SELECT profile FROM players WHERE id = ? FOR UPDATE", [id]);
        const next = fn(parse(rows[0]?.profile));
        await conn.query("UPDATE players SET profile = ?, xp = ? WHERE id = ?", [JSON.stringify(next), Math.max(0, Math.floor(next.xp)), id]);
        await conn.commit();
        return next;
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    },
    async findIdentity(provider, subject) {
      const [rows] = await pool.query<RowDataPacket[]>("SELECT player_id FROM identities WHERE provider = ? AND subject = ?", [provider, subject]);
      return rows[0]?.player_id as string | undefined;
    },
    async linkIdentity(provider, subject, playerId) {
      await pool.query("INSERT INTO identities (provider, subject, player_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE player_id = player_id", [provider, subject, playerId]);
    },
    async leaderboard(limit) {
      // shortcut: ranks from the JSON column; add a generated rating column + index if this gets slow
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT profile FROM players WHERE JSON_VALUE(profile, '$.rating.r') IS NOT NULL
         ORDER BY JSON_VALUE(profile, '$.rating.r') - 2 * JSON_VALUE(profile, '$.rating.rd') DESC LIMIT ?`, [limit]);
      return rankProfiles(rows.map((r) => parse(r.profile)), limit);
    },
    async recordMatch(m) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [res] = await conn.query<ResultSetHeader>("INSERT INTO matches (mode, map_id, started_at, ended_at, winner_team, ranked, bots) VALUES (?, ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?), ?, ?, ?)",
          [m.mode, m.mapId.slice(0, 32), m.startedAt / 1000, m.endedAt / 1000, m.winnerTeam ?? null, m.ranked ? 1 : 0, m.bots]);
        for (const p of m.players) {
          await conn.query("INSERT INTO match_players (match_id, player_id, team, gang, kills, deaths, xp_awarded, name, place, left_early, rating_delta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [res.insertId, p.playerId, p.team, p.gang ?? null, p.kills, p.deaths, p.xp, p.name.slice(0, 24), p.place, p.leftEarly ? 1 : 0, p.ratingDelta ?? null]);
        }
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    },
    async history(playerId, limit) {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT m.mode, m.map_id, UNIX_TIMESTAMP(m.ended_at) AS ended, m.ranked, m.winner_team, m.bots,
           (SELECT COUNT(*) FROM match_players x WHERE x.match_id = m.id) AS humans,
           p.team, p.place, p.kills, p.deaths, p.xp_awarded, p.left_early, p.rating_delta
         FROM match_players p JOIN matches m ON m.id = p.match_id
         WHERE p.player_id = ? ORDER BY p.match_id DESC LIMIT ?`, [playerId, limit]);
      return rows.map((r) => ({
        mode: r.mode, mapId: r.map_id, endedAt: Number(r.ended) * 1000, ranked: r.ranked === 1, won: r.winner_team !== null && r.winner_team === r.team,
        players: Number(r.humans) + Number(r.bots), place: r.place, kills: r.kills, deaths: r.deaths, xp: r.xp_awarded, leftEarly: r.left_early === 1,
        ratingDelta: r.rating_delta ?? undefined,
      }));
    },
    close: () => pool.end(),
  };
}
