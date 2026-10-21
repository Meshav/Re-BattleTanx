# 11 — Stack & Implementation Plan

This is the doc to build from. It narrows doc 09 to the **smallest stack that ships the game**, then lays out phases with checklists. Each phase ends with something playable.

## 11.1 Recommended stack

| Layer | Pick | Why this, not the alternatives |
|-------|------|--------------------------------|
| Language | **TypeScript** (client + server) | One sim codebase runs in browser (offline/split-screen) and on server (online) |
| Build / dev server | **Vite** | Zero-config TS, hot reload, static build output |
| 3D | **Three.js** | Biggest ecosystem, low-poly friendly. Babylon is heavier; PlayCanvas pushes its editor |
| UI (menus, HUD, lobby) | **Plain HTML/CSS over the canvas** | Few screens; React adds nothing here. Add Preact only if menus get complex |
| Physics | **None — hand-rolled** circle-vs-box collision on a 2D plane | Tanks are top-down movers on flat cities. A physics engine costs more than it saves |
| AI pathfinding | **A\* on the 10 m map grid** | Maps are grid cities (doc 08). Destroying a building = flip cells walkable. No navmesh baking |
| Server | **Node.js + `ws`** | Simplest reliable WebSocket server. Swap to uWebSockets.js only if profiling says so |
| Wire format | **JSON first**, binary later | Debuggable; move hot snapshots to `DataView` binary when bandwidth matters (Phase 4) |
| Audio | **Howler.js** | Sprites, pooling, mobile unlock handled |
| Database | **MariaDB** (from Phase 6) | Already run it; schema in doc 09 |
| Auth | **Guest token** (signed JWT) → Discord/Google OAuth in Phase 6 | No passwords stored |
| Testing | **Vitest** | Same config as Vite |
| Assets | **Blender → glTF (.glb)**, Meshopt compression | Native Three.js loader |
| Hosting | **Docker Compose on homelab**: Caddy (TLS + static client + WS proxy) → Node game server → MariaDB | One box, one `docker compose up`. Cloudflare Tunnel if not exposing ports |

**Deliberately not used (yet):** Redis, Colyseus, WebRTC/geckos.io, Rapier/Cannon, Recast navmesh, ECS library, React. Each has a "when to add" in 11.4.

### Monorepo
```
re-tanx/
  packages/
    sim/        # pure TS, no DOM: tanks, weapons, damage, pickups, modes, AI, grid A*
    client/     # Three.js render, input, HUD, split-screen, net client
    server/     # ws server, lobbies, runs sim at 30 Hz, persistence (Phase 6)
  data/         # tanks.json, weapons.json, gangs.json, pickups.json, maps/*.json
  assets/       # .glb, textures, audio
  docs/
  docker-compose.yml
```
npm workspaces; no Turborepo/Nx needed.

**Rule:** `sim` never imports Three.js or Node APIs. If it runs in Vitest without a browser, it runs on the server.

## 11.2 Phases

Durations assume one developer part-time; adjust to taste.

### Phase 0 — Setup (2–3 days)
**Goal:** empty repo that builds, tests and deploys.
- [ ] Repo + npm workspaces (`sim`, `client`, `server`)
- [ ] Vite client renders a ground plane and a box
- [ ] Vitest runs one passing test in `sim`
- [ ] `docker-compose.yml`: Caddy serving client build
- [ ] Deployed to homelab at a private URL
- [ ] CI (GitHub Actions or local hook): typecheck + test

**Exit:** push → test → visible URL.

### Phase 1 — Drive & shoot (1–2 weeks)
**Goal:** the core feel, single player, offline.
- [ ] Fixed 30 Hz sim loop in `sim`, render interpolation in `client`
- [ ] Input layer → `InputState` (keyboard/mouse + Gamepad API)
- [ ] One medium tank: hull drive, independent turret, collision with walls
- [ ] Main cannon: ballistic projectile, hit, damage, death, respawn
- [ ] Chase camera with occlusion fade
- [ ] Graybox grid map loaded from JSON
- [ ] Destructible blocks: 3 stages (intact → damaged → rubble), rubble passable
- [ ] Placeholder SFX (fire, hit, explode)
- [ ] Unit tests: movement step, damage + armor, structure stage changes

**Exit:** driving and wrecking buildings is fun for 5 minutes. If not, fix feel before moving on.

### Phase 2 — Combat content (2–3 weeks)
**Goal:** the BattleTanx toolkit.
- [ ] Light / Medium / Heavy tanks from `data/tanks.json`
- [ ] Specials: guided missile (with missile cam), swarm, mines, shield
- [ ] Super shot rule
- [ ] Pickups with respawn timers; health storage when full
- [ ] Death drops Star + held special
- [ ] Gangs: 3 gangs, 5-tank rosters, signature items, roster cycling
- [ ] HUD: health, roster, special carousel, SUPER badge, minimap, kill feed
- [ ] Control schemes: Arcade, Twin-stick, Classic
- [ ] Tests: super shot, pickup respawn, roster cycling

**Exit:** a solo sandbox with every core mechanic working.

### Phase 3 — Bots + local multiplayer (2–3 weeks)
**Goal:** the N64 couch experience.
- [ ] Grid A* pathfinding; destruction updates walkable cells
- [ ] Tank Brain v1 (utility scoring): Patrol, Engage, Retreat, Seek Pickup, Take Cover
- [ ] Perception: vision cone + LOS raycast, hearing, memory
- [ ] Aim error + reaction time per difficulty
- [ ] Attack tokens
- [ ] Split-screen 2/3/4 viewports, device-to-player assignment
- [ ] Modes: Deathmatch, Annihilation
- [ ] Match setup screen: mode, map, gangs, bot slots, difficulty
- [ ] Post-match scoreboard
- [ ] Headless bot-vs-bot test: 100 matches, no crash, every match ends

**Exit:** 4 players (any mix of humans and bots) finish a match on one screen.

### Phase 4 — Online (3–4 weeks)
**Goal:** the same matches over the internet.
- [ ] `ws` server runs authoritative sim per match
- [ ] Client sends inputs (`seq`, tick, buttons, aim); server validates rates
- [ ] Snapshots at 20 Hz; client-side prediction + reconciliation for own tank
- [ ] Interpolation (~100 ms) for others
- [ ] Destruction sync as events + full state on join
- [ ] Lag compensation for hitscan
- [ ] Private lobbies with 6-char codes; host settings; bot backfill
- [ ] Guest identity (name + signed token)
- [ ] Battlelord mode + Fortress map (QueenLord carry/drop/return, rail Goliath)
- [ ] Dev network simulator (latency/jitter/loss)
- [ ] Switch snapshots to binary if > 40 KB/s per client
- [ ] Reconnect to an in-progress match

**Exit:** 4 remote players at 100 ms play Battlelord with no rubber-banding complaints.

### Phase 5 — Campaign slice + smarter AI (3–4 weeks)
**Goal:** prove single player works.
- [ ] Squad Director: roles, pincer, focus fire, fallback
- [ ] Archetypes (Raider, Brawler, Line, Bulwark) as weight presets
- [ ] AI special-weapon rules (doc 06 §6.5)
- [ ] Mission scripting: objectives, triggers, waves, checkpoints (data-driven JSON)
- [ ] Tank Bucks economy + deploy screen
- [ ] Wingman AI with 4 commands
- [ ] Act I missions 1–4
- [ ] Story stills + text between missions
- [ ] Local save (IndexedDB)
- [ ] 2-player co-op campaign (split-screen and online)

**Exit:** a new player completes missions 1–4 and wants mission 5.

### Phase 6 — Accounts & progression (2–3 weeks)
**Goal:** reasons to come back.
- [ ] MariaDB in compose; migrations (schema from doc 09)
- [ ] OAuth login (Discord/Google); guest → account upgrade keeps progress
- [ ] Server-side XP from match logs; levels 1–50; unlock track
- [ ] Tank mastery (cosmetic)
- [ ] Perks with lobby toggle; off in Classic lobbies
- [ ] Daily/weekly challenges
- [ ] Profile page + match history
- [ ] Quick match (public lobbies)

**Exit:** XP and unlocks persist across devices; no client can grant itself XP.

### Phase 7 — Content complete (6–10 weeks)
**Goal:** feature-complete per docs 03–08.
- [ ] All 9 tanks, all specials, all 11 gangs
- [ ] Modes: Family, Tank Wars, Frenzy, Convoy, Hold 'Em
- [ ] 8 MP maps with final modular art kit
- [ ] Remaining Act I + Act II (24 missions), bosses, secret missions
- [ ] Remaining AI: Sniper, Trickster, Kamikaze; mode-specific bot roles
- [ ] Balance pass using match telemetry

### Phase 8 — Polish & launch (3–4 weeks)
- [ ] Rename game, characters and gangs; confirm zero original assets (README legal note)
- [ ] Audio + VFX pass, screen shake, hit-stop
- [ ] Touch controls + tactical camera; 30 fps on a mid-range phone
- [ ] Accessibility: colorblind team palettes, full rebinding, subtitle size
- [ ] Performance budgets (doc 09 §9.7) met
- [ ] Rate limits, input validation, profanity filter on names
- [ ] Backups for MariaDB
- [ ] Public URL + self-host README

## 11.3 Cross-phase checklist (every phase)
- [ ] Sim logic has a Vitest test for each new rule
- [ ] Balance numbers live in `data/*.json`, not code
- [ ] Bot-vs-bot soak test still passes
- [ ] Runs at 60 fps on the weakest dev machine
- [ ] Deployed to homelab and played by someone other than you
- [ ] CHANGES_LOG / docs updated if the design changed

## 11.4 When to upgrade a piece
| Add | Only when |
|-----|-----------|
| uWebSockets.js | One server process can't hold the matches you need |
| Binary snapshots | JSON bandwidth > 40 KB/s per client |
| WebRTC (geckos.io) | Players report hitches from TCP head-of-line blocking at real latencies |
| Redis | More than one game server process needs a shared lobby list |
| Recast navmesh | Maps stop being grids (slopes, curved roads) |
| Preact | HUD/menu code gets painful in plain DOM |
| Rapier physics | You add physics-driven gameplay (tumbling debris that matters, vehicles that flip) |

## 11.5 Biggest risks
1. **Game feel** — mitigated by Phase 1's exit test before any other work.
2. **Netcode** — prediction/reconciliation is the hardest code here; Phase 4 is sized for it, and the shared `sim` package keeps client and server in agreement.
3. **Scope** — Phases 0–4 already make a complete multiplayer game; everything after is optional depth.
4. **IP takedown** — handled in Phase 8 renaming, but pick the new name early so it isn't a launch-week scramble.
