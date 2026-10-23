# Re-Tanx

A browser fan port inspired by BattleTanx (N64). Arcade tank combat in destructible grid cities: local split-screen, online play with an authoritative server, a 24-mission campaign, bots, progression, replays and a map editor.

**Docs:** [`docs/`](docs/README.md) — [design](docs/design/) (01–08, 15 decomp findings), [engineering](docs/engineering/) (09, 12), [planning](docs/planning/) (10, 11, 13) and [guides](docs/guides/) (map authoring, self-hosting). The code follows doc 11 (phases) and doc 12 (code rules); doc 13 says what's built. `CHANGES_LOG.md` has every section (S01–S35).

## Run
```bash
npm install
npm run dev        # client, http://localhost:5173 (proxies /ws, /auth, /leaderboard, /history to :8787)
npm run server     # game server for online play, :8787
npm run check      # rules + IP-name guard + typecheck + tests (265)
npm run build      # static client in packages/client/dist
docker compose up --build  # web on :24873 (client + proxy) + game server + MariaDB
```
Hosting, environment variables, storage and sign-in: [docs/guides/self-hosting.md](docs/guides/self-hosting.md).

## Controls
| | Keyboard + mouse (P1) | Arrow keys (P2, classic) | Gamepad | Touch |
|---|---|---|---|---|
| Drive | WASD | Arrows | Left stick | Left stick |
| Aim | Mouse | Turret locked to hull, auto-aim cone | Right stick | Right stick (rim = auto-fire) |
| Fire | Left click / Space | Enter | RT / RB / A | Fire button |
| Special / cycle | F or right-click / Q, E | Right Shift / `/` | LT / D-pad, X, Y | Special / Next |
| Camera | V | `.` | Back | Camera button |
| Pause | Esc | Esc | Start | — |

Keyboard bindings for P1 are rebindable in Settings. Hover tanks strafe with A/D (left stick X). Cameras cycle chase → cockpit → top-down.

## What's in the game
- **Campaign:** Acts I & II (24 missions), Scrap economy and deploy screen, wingmen, three-phase bosses, 1–2 player split-screen co-op. Progress saves in the browser.
- **Modes:** Deathmatch, Annihilation, Tank Wars, Rookie, Oracle Raid (with rail cannon), Frenzy, Convoy, Keep Away, King of the Rubble, Horde, Last Gang Standing, Siege.
- **Start menu:** **Play now** starts your last local setup immediately; **Campaign** and **Play online** explain their own routes. Open **Customize local match** for arena, mode, score limit, teams, 1–4 split-screen players and 0–7 bots. Replays and the map editor live in their own expandable section. Every match records a replay. `?quick` skips the menu with the last setup.
- **Performance:** Settings → Graphics → **Performance** is the default for new settings, using native CSS resolution without shadows or antialiasing. **High detail** remains available and existing preferences are respected. Player movement is previewed every frame; simulation and replay rules remain at 30 Hz.
- **Online:** Menu → **Play online** → **Quick match** (fullest open public lobby, or a new one; public lobbies auto-start after 30 s alone / 15 s with company / 3 s full), or host a lobby (5-letter code / invite link `?join=CODE`) or join one. Lobby options: arena, mode, bots, Public, Ranked (Glicko-2; leaderboard in the online menu). Leaving mid-match hands your tank to a bot; a dropped connection can come back for 60 s. Every online match is saved to match history.
- **Progression:** levels 1–50, unlocks (gangs, tanks, perk slots, titles), perks, tank mastery, daily challenges. Guest progress is kept in the browser for local play; online, the server keeps your profile (guest token, optional Discord/Google sign-in) and awards XP itself.
- **Map editor:** paint an arena in the browser, test it, save it, share it as a `?map=CODE` link, use it online. Guide: [docs/guides/14-map-authoring-guide.md](docs/guides/14-map-authoring-guide.md).

## Layout
```
data/              all tunable numbers + maps + campaign missions (JSON)
docs/              design docs, engineering docs, plans, guides (docs/README.md is the index)
packages/sim       pure TS simulation: no DOM, no Node, no three — runs in browser, server and tests
packages/client    Three.js render, input, HUD, audio, menu/match/results screens, editor, online client
packages/server    Node + ws: lobbies, quick match, authoritative 30 Hz matches, rejoin, auth, persistence (files or MariaDB)
sql/               schema.sql (applied on boot; idempotent migrations)
scripts/           check-rules.mjs, check-ip.mjs, gen-audio.mjs, build-act2.py, smoke-match.mjs
```
Sim rules: `World` is plain data; `stepWorld` orders pure systems; systems emit `SimEvent`s that render/audio consume. Determinism is enforced (seeded RNG, quantized inputs), which is what makes replays bit-identical.
Tech-debt ledger: `grep -rn "shortcut:" packages`.

Brand assets live in `packages/client/public/branding/`: `logo-full.png` is the desktop menu logo, `logo-text.png` is the compact menu wordmark, and `icon.png` appears on the pause screen. The supplied black-background wordmark is retained as `logo-text-black.png`. The browser favicon is `packages/client/public/favicon.ico`.

## Audio
All sounds are original placeholders, made from code by `node scripts/gen-audio.mjs` (music needs ffmpeg; `node scripts/gen-audio.mjs countdown_beep` rewrites just that sound). They live in `packages/client/public/audio/`: 42 sound effects as `sfx/*.wav` and two music loops as `music/*.mp3`. To swap in a recorded sound, drop a file with the same name over the placeholder. Levels, pitch variation and the voice limit for each sound are set in `data/audio.json`. Event-to-sound mapping is in `packages/client/src/audio/sfx.ts`.

## Legal
Fan project, non-commercial, no ripped assets. Every original name is replaced on screen via `data/names.json` and guarded by `scripts/check-ip.mjs`; the game title itself is still to be chosen. Details: [docs/README.md](docs/README.md#legal--ip-note-read-first).
