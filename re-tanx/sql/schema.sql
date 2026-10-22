-- MariaDB schema (doc 09 §9.6). Used when DATABASE_URL is set (packages/server/src/persist/mariaStore.ts); otherwise the server keeps one JSON file per player.
-- The profile is a JSON column so its shape can evolve without migrations; xp is copied out for leaderboards.
CREATE TABLE IF NOT EXISTS players (
  id VARCHAR(32) PRIMARY KEY,               -- guest id from the signed token (OAuth subjects map onto this later)
  handle VARCHAR(24) NULL,
  xp INT UNSIGNED NOT NULL DEFAULT 0,       -- denormalised for leaderboards
  profile JSON NOT NULL,                    -- sim/progression/profile.ts Profile
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY xp_idx (xp)
);

-- Match history: one row per online match, one per human in it (bots are only counted).
CREATE TABLE IF NOT EXISTS matches (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  mode VARCHAR(16) NOT NULL, map_id VARCHAR(32) NOT NULL,
  started_at DATETIME NOT NULL, ended_at DATETIME NOT NULL, winner_team TINYINT NULL
);

CREATE TABLE IF NOT EXISTS match_players (
  match_id BIGINT UNSIGNED NOT NULL, player_id VARCHAR(32) NOT NULL,
  team TINYINT NOT NULL, gang VARCHAR(24) NULL,
  kills SMALLINT NOT NULL, deaths SMALLINT NOT NULL, xp_awarded INT NOT NULL,
  PRIMARY KEY (match_id, player_id)
);

-- S27 additions (ALTER ... IF NOT EXISTS keeps older databases in step)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS ranked TINYINT NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS bots TINYINT NOT NULL DEFAULT 0;
ALTER TABLE match_players ADD COLUMN IF NOT EXISTS name VARCHAR(24) NOT NULL DEFAULT '';
ALTER TABLE match_players ADD COLUMN IF NOT EXISTS place TINYINT NOT NULL DEFAULT 0;
ALTER TABLE match_players ADD COLUMN IF NOT EXISTS left_early TINYINT NOT NULL DEFAULT 0;
ALTER TABLE match_players ADD COLUMN IF NOT EXISTS rating_delta SMALLINT NULL;
CREATE INDEX IF NOT EXISTS player_time ON match_players (player_id, match_id);

-- OAuth sign-in: one row per (provider, account) pointing at the player it signs in as (doc 11 Phase 6).
CREATE TABLE IF NOT EXISTS identities (
  provider VARCHAR(16) NOT NULL,
  subject VARCHAR(64) NOT NULL,
  player_id VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (provider, subject),
  KEY player_idx (player_id)
);
