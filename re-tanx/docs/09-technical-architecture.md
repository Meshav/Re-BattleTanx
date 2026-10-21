# 09 — Technical Architecture

## 9.1 Stack
The chosen stack, the repo layout, and when to upgrade each piece are in **doc 11 §11.1**. In short: TypeScript, Vite, Three.js, plain HTML UI, hand-rolled collision, grid A*, Node + `ws`, MariaDB, Docker Compose on the homelab.

## 9.2 Repo layout
See doc 11 §11.1. The shared simulation lives in `packages/sim`, and the API lives inside `server` until it needs to be split out.

## 9.3 Simulation
- **Fixed timestep 30 Hz** sim (shared package), rendered at display rate with interpolation.
- **ECS-lite**: plain arrays/maps of components (Transform, Tank, Health, Weapon, Inventory, AIBrain, Pickup, Destructible, Projectile).
- Deterministic-enough math (no reliance on cross-machine float determinism — server is truth).
- Same sim runs **locally** for single-player/split-screen (no server needed → playable offline / as a static site).

## 9.4 Netcode
- **Client → server**: input commands `{seq, tick, move, turretAngle, fire, special, swap}` at 30 Hz.
- **Server → client**: snapshots at 20 Hz, delta-compressed against last acked snapshot; binary encoding (custom DataView or `msgpackr`).
- **Client prediction** for own tank movement + reconciliation on snapshot.
- **Interpolation** of other entities ~100 ms behind.
- **Lag compensation** for hitscan: server rewinds target positions by the shooter's RTT/2 (cap 200 ms).
- Projectiles: server-spawned; client spawns a predicted visual immediately and reconciles.
- **Destruction state** sent as events (`structureId, stage`) + included in join snapshot.
- Bandwidth target: < 40 KB/s per client at 8 players.

## 9.5 Server topology
```
[Browser] ──HTTPS──> [Static host / CDN]  (client bundle, assets)
    │
    ├──HTTPS──> [API service] ──> [MariaDB]
    │
    └──WSS────> [Match server(s)]  (one Node process hosts N matches; ~8–12 matches/core)
                     │
                     └──> [API] post match results (server-signed)
```
- Lobby service can live inside the match server for v1 (single box).
- Self-hostable on a homelab box behind a reverse proxy (Caddy/Nginx) with TLS; WebSocket upgrade passthrough.
- Horizontal scale later: Redis lobby registry + multiple match servers.

## 9.6 Data model (MariaDB, draft)
```sql
CREATE TABLE players (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  handle VARCHAR(24) NOT NULL UNIQUE,
  auth_provider VARCHAR(16), auth_subject VARCHAR(128),
  level SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  xp INT UNSIGNED NOT NULL DEFAULT 0,
  title VARCHAR(32), emblem JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (auth_provider, auth_subject)
);

CREATE TABLE unlocks (
  player_id BIGINT UNSIGNED, unlock_key VARCHAR(48),
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id, unlock_key)
);

CREATE TABLE tank_mastery (
  player_id BIGINT UNSIGNED, tank_id VARCHAR(24),
  xp INT UNSIGNED DEFAULT 0, level TINYINT UNSIGNED DEFAULT 1,
  PRIMARY KEY (player_id, tank_id)
);

CREATE TABLE loadouts (
  player_id BIGINT UNSIGNED PRIMARY KEY,
  perks JSON, cosmetics JSON, favorite_gang VARCHAR(24)
);

CREATE TABLE campaign_progress (
  player_id BIGINT UNSIGNED, mission_id VARCHAR(32),
  best_grade CHAR(1), caches_found TINYINT UNSIGNED, best_time_ms INT UNSIGNED,
  bucks_on_entry SMALLINT UNSIGNED,
  PRIMARY KEY (player_id, mission_id)
);

CREATE TABLE matches (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  mode VARCHAR(16), map_id VARCHAR(32), ranked BOOLEAN,
  started_at DATETIME, ended_at DATETIME, winner_team TINYINT
);

CREATE TABLE match_players (
  match_id BIGINT UNSIGNED, player_id BIGINT UNSIGNED NULL, -- NULL = bot/guest
  team TINYINT, gang VARCHAR(24),
  kills SMALLINT, deaths SMALLINT, assists SMALLINT,
  objective_score INT, damage_dealt INT, structures_destroyed SMALLINT,
  xp_awarded INT,
  PRIMARY KEY (match_id, team, player_id)
);

CREATE TABLE challenges (
  player_id BIGINT UNSIGNED, challenge_id VARCHAR(32), period_start DATE,
  progress INT, completed_at DATETIME NULL,
  PRIMARY KEY (player_id, challenge_id, period_start)
);
```
Ranked ratings table added post-1.0.

## 9.7 Performance budgets
| Target | Budget |
|--------|--------|
| Initial download | < 15 MB to first match (lazy-load maps/audio) |
| Draw calls | < 300 per viewport (instance props, merge static geometry) |
| Frame | 60 fps on integrated GPU at 1080p single view |
| Mobile | 30 fps on mid-range phone, tactical camera, reduced effects |
| Server tick | < 10 ms per match tick incl. AI |

Techniques: instanced meshes for props, baked lighting for static geo, pooled projectiles/particles, LOD for distant tanks, compressed textures (KTX2/Basis), Draco/Meshopt geometry.

## 9.8 Input
Unified input layer → per-player `InputState`. Sources: keyboard/mouse (Pointer Lock), Gamepad API (up to 4), touch. Split-screen assigns devices to player slots in the lobby.

## 9.9 Testing
- Unit tests on `shared` sim (damage, pickups, mode win conditions).
- Headless bot-vs-bot matches in CI for crash/regression + balance telemetry.
- Network sim: artificial latency/jitter/loss in dev (e.g., 150 ms ± 30, 2% loss).

## 9.10 Save & settings
Settings (bindings, graphics, audio) in localStorage; progression on server. Offline/guest campaign progress in IndexedDB with optional upload when the player creates an account.
