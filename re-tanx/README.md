# Re-Tanx

A browser fan port inspired by BattleTanx (N64). Arcade tank combat in destructible grid cities.
Design docs are in [`docs/`](docs/README.md) (01–14, mirrored in the Re-Tanx project); this repo follows doc 11 (phases) and doc 12 (code rules). Doc 13 says what's built; doc 14 explains how to make maps; `CHANGES_LOG.md` has every section (S01–S31).

## Run
```bash
npm install
npm run dev        # client, http://localhost:5173 (proxies /ws to :8787)
npm run server     # game server for online play, :8787
npm run check      # rules + IP-name guard + typecheck + tests
npm run build      # static client in packages/client/dist
docker compose up --build  # Caddy on :8080 (client + proxy) + game server + MariaDB
```

## Controls
| | Keyboard + mouse (P1) | Arrow keys (P2, classic) | Gamepad |
|---|---|---|---|
| Drive | WASD | Arrows | Left stick |
| Aim | Mouse | Turret locked to hull, auto-aim cone | Right stick |
| Fire | Left click / Space | Enter | RT / RB / A |
| Special / cycle | F or right-click / Q, E | Right Shift / `/` | LT / D-pad, X, Y |
| Camera | V | `.` | Back |
| Pause | Esc | Esc | Start |

Campaign: Acts I & II (24 missions) — Scrap, deploy screen, wingmen, bosses, 1–2 player co-op. Progress saves in the browser.
Modes: Deathmatch, Annihilation, Tank Wars, Rookie, Oracle Raid (with rail cannon), Frenzy, Convoy, Keep Away, King of the Rubble, Horde, Last Gang Standing, Siege.
Menu: arena (built-in or your own from the map editor), mode, score limit, free-for-all or humans-vs-bots, 1–4 local players (split-screen), 0–7 bots, bot skill. Replays of every match; cameras chase / cockpit / top-down.
`?quick` skips the menu with the last setup.

## Progression
Levels 1–50, unlocks (gangs, tanks, perk slots, titles), perks, tank mastery, daily challenges. Guest progress
is kept in the browser for local play; online, the server keeps your profile (guest token) and awards XP itself.
Set `SERVER_SECRET` so guest profiles survive restarts; profiles live in `DATA_DIR` (a Docker volume).

## Online
Menu → **Play online** → **Quick match** (joins the fullest open public lobby or opens one; public lobbies start by themselves after 30 s alone / 15 s with company / 3 s full), or host a lobby (5-letter code / invite link `?join=CODE`) or join one. Lobby options: arena, mode, bots, Public, Ranked (Glicko-2; leaderboard in the online menu).
The server is authoritative: clients send inputs (+ the tick they're looking at), get 20 Hz snapshots, predict their own tank and interpolate others. Hitscan shots are lag-compensated up to 250 ms.
Leaving mid-match hands your tank to a bot. A **dropped connection** can come back for 60 s (automatic retry, or "Rejoin your match" after a reload). Every match is saved to **match history** (online menu).
HTTP: `GET /health` · `GET /leaderboard` · `GET /history` (Bearer player token; your own matches) · `/auth/*` (sign-in).
For HTTPS on a public host set `SITE_ADDRESS=game.example.com` on the `web` service.

After deploying, `node scripts/smoke-match.mjs wss://your.host/ws` plays one short match against bots, waits for the XP award and checks match history.

**Storage.** With `DATABASE_URL=mysql://user:pass@host:3306/db` the server uses MariaDB and creates its tables from `sql/schema.sql` on boot. `docker compose up` runs MariaDB for you. Without `DATABASE_URL` it writes one JSON file per player under `DATA_DIR`. To run the store tests against a scratch database: `TEST_DATABASE_URL=mysql://… npm test`.

**Sign-in (optional).** Set `PUBLIC_URL` (the address players use) and a provider's OAuth credentials: `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET` and/or `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`. Register the redirect URI `${PUBLIC_URL}/auth/<provider>/callback` with the provider. The online menu then shows "Sign in with …". The first sign-in links the guest you were playing as, so progress carries over. After that, signing in on any device resumes the same player.

## Layout
```
data/              all tunable numbers + maps (JSON)
packages/sim       pure TS simulation: no DOM, no Node, no three — runs in browser, server and tests
packages/client    Three.js render, input, HUD, audio, menu/match/results screens, online client
packages/server    Node + ws: lobbies, quick match, authoritative 30 Hz matches, rejoin, auth, persistence (files or MariaDB)
sql/               schema.sql (applied on boot; idempotent migrations)
scripts/           check-rules.mjs, check-ip.mjs, gen-audio.mjs, build-act2.py, smoke-match.mjs
```
Sim rules: `World` is plain data; `stepWorld` orders pure systems; systems emit `SimEvent`s that render/audio consume.
Tech-debt ledger: `grep -rn "shortcut:" packages`.

## Audio
All sounds are original placeholders, made from code by `node scripts/gen-audio.mjs` (music needs ffmpeg). They live in `packages/client/public/audio/`: 40 sound effects as `sfx/*.wav` and two music loops as `music/*.mp3`. To swap in a recorded sound, drop a file with the same name over the placeholder. Levels, pitch variation and the voice limit for each sound are set in `data/audio.json`. Event-to-sound mapping is in `packages/client/src/audio/sfx.ts`.
