# 11 — Stack & Implementation Plan

This is the doc to build from. It narrows doc 09 to the **smallest stack that ships the game**, then lays out phases with checklists. Each phase ends with something playable. Code shape and conventions are in **doc 12**.

> **Progress (Oct 2026):** the repo was built in 30 sections (S01–S30; see `CHANGES_LOG.md`). Checkboxes below reflect the repo. `[~]` = partly built (the note says what's missing).

## 11.1 Recommended stack

| Layer | Pick | Why this, not the alternatives | As built |
|-------|------|--------------------------------|----------|
| Language | **TypeScript** (client + server) | One sim codebase runs in the browser (offline/split-screen) and on the server (online) | ✅ |
| Build / dev server | **Vite** | Zero-config TS, hot reload, static build output | ✅ |
| 3D | **Three.js** | Biggest ecosystem, low-poly friendly | ✅ procedural low-poly models |
| UI (menus, HUD, lobby) | **Plain HTML/CSS over the canvas** | Few screens; React adds nothing | ✅ |
| Physics | **None — hand-rolled** circle-vs-box on a 2D plane | Tanks are top-down movers on flat cities | ✅ |
| AI pathfinding | **A\* on the 10 m map grid** | Maps are grid cities | ✅ |
| Server | **Node.js + `ws`** | Simplest reliable WebSocket server | ✅ (run with `tsx`) |
| Wire format | **JSON first**, binary later | Debuggable | ✅ JSON with hot/meta/private split; binary not needed yet |
| Audio | ~~Howler.js~~ → **Web Audio** | The sound set is small and generated (`scripts/gen-audio.mjs`); buses, panning, voice limits and crossfades take ~200 lines | ✅ |
| Database | **MariaDB** | Already run it; schema in doc 09 | ✅ (`mysql2`); JSON-file store when no `DATABASE_URL` |
| Auth | **Signed guest token** → Discord/Google OAuth | No passwords stored | ✅ HMAC tokens + authorization-code sign-in |
| Testing | **Vitest** (+ Playwright smoke tests) | Same config as Vite | ✅ 255 tests |
| Lint | ~~ESLint + Prettier~~ → **`scripts/check-rules.mjs` + `check-ip.mjs`** | File size cap, banned file names, no default exports, sim import boundary, original-IP name guard | ✅ (`shortcut:` — move to ESLint when CI arrives) |
| Assets | Blender → glTF (.glb) | Native Three.js loader | ⏳ procedural geometry for now (specs: doc 14 §6) |
| Hosting | **Docker Compose on homelab**: Caddy (TLS + static + proxy) → Node game server → MariaDB | One `docker compose up` | ✅ built and run end-to-end |

**Deliberately not used (yet):** Redis, Colyseus, WebRTC/geckos.io, Rapier/Cannon, Recast navmesh, ECS library, React. Each has a "when to add" in 11.4.

### Monorepo (as built)
```
re-tanx/
  packages/
    sim/        # pure TS, no DOM/Node: tanks, weapons, damage, pickups, modes, AI, A*, replays, lag comp, map checks
    client/     # Three.js render, input, HUD, audio, split-screen, net client, editor
    server/     # ws + http, lobbies, quick match, matches at 30 Hz, auth, persistence
  data/         # tanks, specials, pickups, gangs, ai, modes, rules, progression, audio, names, maps/, campaign/
  docs/         # these design docs (01–14) + map templates
  sql/          # schema.sql (applied on boot)
  scripts/      # rule checks, IP guard, audio generator, Act II builder, smoke match
  Dockerfile, docker-compose.yml, Caddyfile
```

**Rule:** `sim` never imports Three.js or Node APIs. If it runs in Vitest without a browser, it runs on the server.

## 11.2 Phases

### Phase 0 — Setup
- [x] Repo + npm workspaces (`sim`, `client`, `server`)
- [x] Vite client renders the world
- [x] Vitest
- [x] Lint rules from doc 12 (custom scripts instead of ESLint)
- [x] `docker-compose.yml`: Caddy serving the client build
- [ ] Deployed to the homelab at a private URL — *ready; needs your host*
- [ ] CI (GitHub Actions or local hook) — *`npm run check` exists; not wired to CI*

### Phase 1 — Drive & shoot
- [x] Fixed 30 Hz sim loop, render interpolation
- [x] Input layer → `InputState` (keyboard/mouse + Gamepad API + touch)
- [x] Tanks: hull drive, independent turret, wall collision
- [x] Main cannon: projectile, hit, damage, death, respawn
- [x] Chase camera with occlusion fade (+ cockpit and top-down)
- [x] Grid maps from JSON
- [x] Destructible blocks: 3 stages, rubble passable
- [x] SFX
- [x] Unit tests

### Phase 2 — Combat content
- [x] Light / Medium / Heavy tanks from `data/tanks.json`
- [x] Specials: guided missile (missile cam), swarm, mines, shield (+ 10 more)
- [x] Super shot rule
- [x] Pickups with respawn timers
- [x] Death drops
- [x] Gangs with 5-tank rosters, signature items, roster cycling
- [x] HUD: health, roster, specials, SUPER badge, minimap, kill feed
- [x] Control schemes: Arcade, Twin-stick, Classic
- [x] Tests

### Phase 3 — Bots + local multiplayer
- [x] Grid A*; destruction updates walkable cells
- [~] Tank Brain v1 — *Patrol, Engage, Retreat, Seek Pickup built; Take Cover not*
- [x] Perception: vision cone + LOS, hearing, memory
- [x] Aim error + reaction time per difficulty
- [x] Attack tokens
- [x] Split-screen 2/3/4 viewports, device assignment
- [x] Modes: Deathmatch, Annihilation
- [x] Match setup screen
- [x] Post-match scoreboard
- [x] Headless bot-vs-bot soak test

### Phase 4 — Online
- [x] `ws` server runs the authoritative sim per match
- [x] Client sends inputs (`seq`, buttons, aim, view tick); server validates and rate-limits
- [x] Snapshots at 20 Hz; prediction + reconciliation for your own tank
- [x] Interpolation for others
- [x] Destruction sync + full state on join
- [x] **Lag compensation for hitscan** *(S25: 250 ms rewind window, clamped, replay-safe)*
- [x] Private lobbies with codes (5 letters); host settings; bot backfill
- [x] Guest identity (name + signed token)
- [x] Battlelord mode + Fortress map (Oracle carry/drop/return, **rail cannon** *(S18)*)
- [ ] Dev network simulator (latency/jitter/loss)
- [ ] Switch snapshots to binary if > 40 KB/s per client — *not needed so far*
- [x] **Reconnect to an in-progress match** *(S26: 60 s grace, bot holds the seat, auto-retry + "Rejoin" after reload)*

### Phase 5 — Campaign slice + smarter AI
- [~] Squad Director — *roles + per-mode goals; no pincer/fallback layer*
- [~] Archetypes — *Raider, Brawler, Line, Bulwark, Artillery*
- [x] AI special-weapon rules (doc 06 §6.5)
- [x] Mission scripting: objectives, triggers, waves (data-driven JSON)
- [x] Tank Bucks (Scrap) economy + deploy screen
- [~] Wingman AI — *Follow only; no command wheel*
- [x] Act I missions
- [~] Story stills + text — *briefing/debrief text; no illustrations*
- [x] Local save (localStorage rather than IndexedDB)
- [~] 2-player co-op campaign — *split-screen yes; online no*

### Phase 6 — Accounts & progression
- [x] MariaDB in compose; schema applied on boot with idempotent migrations
- [x] OAuth login (Discord/Google); guest → account keeps progress
- [x] Server-side XP from the authoritative world; levels; unlock track
- [x] Tank mastery
- [x] Perks with lobby toggle; off in Classic lobbies
- [x] Daily/weekly challenges
- [x] **Match history** *(S27: MariaDB `matches`/`match_players`, `GET /history`, menu view)* — [~] profile page shows local stats; online history lives in the online menu
- [x] **Quick match (public lobbies)** *(S28: fullest-lobby matching, auto-start 30/15/3 s)*

### Phase 7 — Content complete
- [x] All tanks, all specials, all gangs
- [x] Modes: Family (Rookie), Tank Wars, Frenzy, **Convoy** *(S29)*, Hold 'Em (Keep Away)
- [~] MP maps — *5 arenas + player-made arenas via the map editor (guide: doc 14); final art kit not started*
- [x] Act I + Act II (24 missions), bosses — [ ] secret missions
- [~] Remaining AI — *Artillery built; Trickster, Kamikaze not*; mode-specific bot roles ✅ (incl. Convoy, rail cannon)
- [ ] Balance pass using match telemetry — *match history now gives the data*

### Phase 8 — Polish & launch
- [~] Rename pass — *every original name replaced via `data/names.json`, guarded by `check-ip`; **final game title still to choose***
- [x] Audio pass (placeholder procedural set); screen shake — [ ] hit-stop
- [x] Touch controls + top-down camera — [ ] 30 fps measured on a real phone
- [x] Accessibility: colour-blind palette, full rebinding, reduced motion
- [ ] Performance budgets (doc 09 §9.7) measured on target hardware
- [x] Rate limits, input validation, name sanitizing — [ ] profanity filter
- [ ] Backups for MariaDB
- [~] Public URL + self-host README — *README covers self-hosting; public URL pending*

### Beyond the plan (built)
Enhancement modes (King of the Rubble, Last Gang Standing, Horde, Siege) · ranked Glicko-2 + leaderboard · replays for every match type · in-browser map editor with share codes and online custom arenas · cockpit camera.

## 11.3 Cross-phase checklist (every phase)
- [ ] Sim logic has a Vitest test for each new rule
- [ ] Balance numbers live in `data/*.json`, not code
- [ ] `npm run check` passes: no file over 250 lines, no `utils`/`helpers` files, `sim` import boundary intact, no original-game names on screen
- [ ] Bot-vs-bot soak test still passes
- [ ] Runs at 60 fps on the weakest dev machine
- [ ] Deployed to the homelab and played by someone other than you
- [ ] CHANGES_LOG / docs updated if the design changed

## 11.4 When to upgrade a piece
| Add | Only when |
|-----|-----------|
| uWebSockets.js | One server process can't hold the matches you need |
| Binary snapshots | JSON bandwidth > 40 KB/s per client |
| WebRTC (geckos.io) | Players report hitches from TCP head-of-line blocking at real latencies |
| Redis | More than one game server process needs a shared lobby list (quick match and rejoin both assume one process today) |
| Generated rating column + index | Leaderboard query gets slow on the JSON column |
| Recast navmesh | Maps stop being grids |
| Preact | HUD/menu code gets painful in plain DOM |
| Rapier physics | Physics-driven gameplay that matters |
| ESLint | CI exists and the custom rule scripts stop being enough |

## 11.5 Biggest risks (now)
1. **Real-network feel** — lag compensation and rejoin are built and tested on localhost. They need a playtest at real latency.
2. **First live sign-in / deploy** — OAuth was tested against a fake provider, and Docker on stand-in base images. Do one real run of each.
3. **Art** — everything is procedural placeholder geometry and sound (asset specs: doc 14 §6).
4. **IP** — names are replaced; the final title isn't chosen yet.
