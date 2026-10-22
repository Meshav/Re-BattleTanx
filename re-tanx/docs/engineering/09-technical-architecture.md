# 09 — Technical Architecture

> **Status (Oct 2026, through S29):** this doc describes the system **as built**. Items still planned are marked ⏳. Doc 11 has the phased checklist; doc 12 has the module map; the repo's `CHANGES_LOG.md` has per-section detail.

## 9.1 Stack
TypeScript everywhere, Vite, Three.js, plain HTML/CSS UI, hand-rolled 2D collision, grid A*, Node + `ws`, MariaDB (via `mysql2`) with a JSON-file fallback, Docker Compose + Caddy. Audio is plain Web Audio, not Howler: the sound set is small and generated (doc 11 §11.1 explains the choice).

## 9.2 Repo layout
npm workspaces: `packages/sim` (pure simulation, no DOM/Node), `packages/client` (Vite + Three.js), `packages/server` (Node + ws, run with tsx). Data in `data/*.json`, SQL in `sql/schema.sql`, tooling in `scripts/`, these docs in `docs/`. Module maps: doc 12 §12.4.

## 9.3 Simulation
- **Fixed 30 Hz** shared sim, rendered at display rate. Other tanks interpolate; locally controlled tanks preview the fractional tick with live input on a copy of their state (including wall collision). Replays keep tick interpolation. Frame catch-up is capped at two steps and reset on tab visibility changes.
- **World is plain data**; `stepWorld` is the only place systems are ordered. Systems emit `SimEvent`s that render, audio, HUD and net consume.
- **Fully deterministic** given a seed and the inputs. Seeded RNG lives in the world; there's no `Math.random` or time in the sim. Inputs are quantized before the sim sees them. This is what makes replays (§9.11) bit-identical between browser, server and Node.
- The same sim runs **locally** for single-player, split-screen and campaign: no server needed, playable offline as a static site.

## 9.4 Netcode (as built)
- **Client → server:** `{t:"input", seq, input, view}` at 30 Hz. `input` = throttle, steer, strafe, aim, fire, special, cycle. `view` = the server tick the client's interpolated view of other tanks shows (for lag compensation). Everything is parsed and clamped in `sim/net/validate.ts`.
- **Server → client:** snapshots at **20 Hz**, JSON.
  - **hot** per-tank state every snapshot; **meta** (names, rosters, specials…) only when changed, plus a full refresh every 30 ticks.
  - **private** fields (your own heat, specials) only to the owner.
  - Structure stages and pickups only when changed. Events ride along.
  - ⏳ Binary encoding (only if JSON > 40 KB/s per client; not needed yet).
- **Client prediction** of your own tank (the shared `moveTank`, including rail riding) with reconciliation on each snapshot's `ack`, plus the same per-frame visual preview used offline. **Interpolation** of other tanks between the last two snapshots.
- **Input bursts:** the server consumes the newest movement each tick, preserving fire/special taps and the last cycle direction in the bounded burst. It acknowledges the newest sequence instead of carrying a backlog of old controls into later ticks. Online pause sends neutral controls so the server stops repeating the last held input.
- **Lag compensation (hitscan)** ✅ *(S25)*:
  - The server keeps every tank's position for the last **8 ticks (~250 ms)** (`sim/systems/lagComp.ts`).
  - An instant-hit shot (machine gun, laser gun, laser special) is resolved with other tanks moved back to the shooter's `view` tick, then restored. Tanks that weren't on the field then can't be hit.
  - The claimed tick is clamped to the window at fire time. Bots, and seats a bot took over, shoot in the present.
  - Structures aren't rewound. Projectiles (shells, rockets, mortars, flame) aren't either: they travel in the shared world.
- **Destruction state**: stage string in snapshots when changed; a full state on join and rejoin.
- **Rejoin** ✅ *(S26)*: a closed socket marks the seat "away" for 60 s with a bot driving. `{t:"rejoin", code}` with the same signed token reclaims it: fresh input queue, full snapshot, and a `"human"` action in the replay.
- **Bandwidth**: comfortably under the 40 KB/s budget at 8 players in tests. ⏳ A dev network simulator (latency/jitter/loss) isn't built.

## 9.5 Server topology (as built)
```
[Browser] ──HTTPS──> [Caddy]  static client + audio (/srv)
                       ├── /ws          → game:8787  (WebSocket: lobbies + matches)
                       ├── /auth/*      → game:8787  (Discord/Google sign-in)
                       ├── /leaderboard → game:8787  (top 20 ranked)
                       ├── /history     → game:8787  (your matches; Bearer token)
                       └── /health      → game:8787
[game] one Node process: lobby registry + N matches (each its own World + 30 Hz ticker) ──> [MariaDB]
```
- No separate API service: the few HTTP endpoints live in the game server.
- Docker Compose runs `db` (mariadb:11, healthcheck), `game` and `web` (Caddy). `SITE_ADDRESS` turns on automatic HTTPS.
- Env: `SERVER_SECRET` (token signing), `DATABASE_URL`, `PUBLIC_URL` + `DISCORD_/GOOGLE_CLIENT_ID/SECRET` (optional sign-in), `DATA_DIR` (file store).
- The Dockerfile's base images are build args (`NODE_IMAGE`, `CADDY_IMAGE`) for mirrors or pinned digests.
- Health and smoke: `GET /health`; `node scripts/smoke-match.mjs wss://host/ws` plays a match against bots and checks the award and match history.
- ⏳ Horizontal scale (Redis lobby registry, several game processes) only when one process isn't enough (doc 11 §11.4).

## 9.6 Data model (MariaDB, as built — `sql/schema.sql`)
Tables are created on boot. Later columns are added with idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, so older databases upgrade themselves.

```sql
players (id VARCHAR(32) PK,            -- player id from the signed token
         handle VARCHAR(24) NULL,
         xp INT UNSIGNED,              -- copied out for sorting
         profile JSON,                 -- whole Profile: xp, perks, mastery, totals, challenges, rating, name
         updated_at DATETIME)
identities (provider, subject PK, player_id)       -- Discord/Google account → player; first link wins
matches (id PK, mode, map_id, started_at, ended_at, winner_team, ranked, bots)
match_players (match_id, player_id PK, team, gang, kills, deaths, xp_awarded,
               name, place, left_early, rating_delta)   + index (player_id, match_id)
```
- **Profile as a JSON column**: the shape can evolve without migrations, and the sim's `sanitizeProfile` validates it on read.
- **Atomic updates**: `ProfileStore.update(id, fn)` inserts the row if missing, then `SELECT … FOR UPDATE` inside a transaction. Concurrent awards can't lose XP; tested with 10 parallel updates.
- **Ranking** reads `rating` from the JSON column (`shortcut:` note — add a generated column + index if it gets slow).
- ⏳ Not stored server-side yet: campaign progress (kept in the browser), unlocks as rows (derived from XP), challenge rows (inside the profile JSON).
- **File store** (no `DATABASE_URL`): one JSON file per player, `identities.json`, `matches.jsonl`. Atomic temp-file+rename writes; fine for a homelab.

## 9.7 Performance budgets
| Target | Budget | Status |
|--------|--------|--------|
| Initial download | < 15 MB to first match | ✅ ~0.7 MB JS + ~2 MB audio |
| Frame | 60 fps on integrated GPU at 1080p single view | Low-poly procedural models; "Low" graphics setting |
| Mobile | 30 fps mid-range phone, touch twin-stick | Touch controls ✅; ⏳ not measured on hardware |
| Server tick | < 10 ms per match tick incl. AI | Soak tests run bot matches far faster than real time |

⏳ Not built (no art assets yet): instancing, baked lighting, KTX2/Meshopt.

## 9.8 Input
Unified layer → per-player `InputState`: keyboard+mouse, arrow keys, Gamepad API (up to 4), touch twin-stick. Full key rebinding in Settings. Cameras: chase / cockpit / top-down (V or Back).

## 9.9 Testing
- **Vitest**, 255 tests across sim, client and server. `npm run check` = structure rules + IP-name guard + typecheck + tests.
- Sim rules tested beside their code. **Soak test**: bot-vs-bot matches end with no NaNs. Every campaign mission is tested for marker sanity, drivability (flood fill) and scripted completion.
- **Determinism tests**: replays re-simulate bit-identically, including lag compensation, dropouts and rejoins, recorded in Chromium and re-run in Node.
- **Server integration**: real WebSocket clients for lobbies, rejoin, trust boundaries and history auth. Fake timers for quick-match auto-start.
- **Store contract tests** run against memory, files and real MariaDB (`TEST_DATABASE_URL`).
- **Headless-browser smoke tests** (Playwright + Chromium) per feature: two-browser online, touch, campaign, rejoin, quick match, map editor.
- ⏳ Network simulator for latency/jitter/loss.

## 9.10 Save & settings
- Browser (`localStorage`): settings (volume, music, quality, colour-blind, reduced motion, bindings), local profile (offline XP), campaign progress, last match setup, saved arenas, last replay, player token, pending rejoin.
- Server: online profile, ratings, identities, match history.
- ⏳ Uploading offline campaign progress to the account.

## 9.11 Replays
A replay is setup + human inputs (only on ticks where they change) + rare actions:
- **Setup:** map or embedded custom arena, slots, seed, mode, or mission id + opening purchase.
- **Actions:** campaign redeploy, `"bot"` takeover, `"human"` rejoin.

Local, campaign and online matches all record. The server records online matches and sends each player the replay at the end. Playback has a spectator camera, tank cycling and 1×/2×/4× speed. Replay files are validated before use. A 3-minute match is roughly 100–200 KB.
