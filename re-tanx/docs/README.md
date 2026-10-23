# Re-Tanx — BattleTanx Fan Port (Web)

> A browser-playable, fan-made homage to **BattleTanx** (N64, 1998) and **BattleTanx: Global Assault** (N64/PS1, 1999) by The 3DO Company. "Re-Tanx" is the repo and working name; the docs' earlier working title was "Project TREADLORD". The final public title is still open (see the legal note).

## Vision
Fast, arcade tank combat in destructible post-apocalyptic cities. Pick a gang, roll a squad of five tanks, blow up everything. Faithful to the N64 feel (snappy arcade handling, chunky destruction, 4-player chaos), with modern additions: online play, bots that don't feel dumb, and light progression.

**Pillars**
1. **Arcade, not sim** — instant, readable, forgiving controls.
2. **Everything breaks** — buildings and walls hide paths and pickups.
3. **Couch-to-online** — local split-screen *and* browser multiplayer.
4. **Short sessions** — a match is 3–8 minutes; a campaign mission 5–10.
5. **Progression is flavor, not power** — leveling unlocks options, never a stat wall in PvP.

## How the docs are organised
Docs keep their original numbers (01–14) so "doc 09 §9.4" style references keep working, and are grouped by who reads them:

| Folder | For | Contents |
|--------|-----|----------|
| [`design/`](design/) | Game design: what the game is and how it should feel | 01–08, 15 |
| [`engineering/`](engineering/) | How it's built: netcode, data, module maps, code rules | 09, 12 |
| [`planning/`](planning/) | Where it stands: roadmap, phased plan, status | 10, 11, 13 |
| [`guides/`](guides/) | How-tos for people doing a job: making maps, self-hosting | 14, self-hosting, map templates |

Every doc marks what's built against the repo (✅ built and tested · ⏳ planned). Per-section history is in the repo's [`CHANGES_LOG.md`](../CHANGES_LOG.md) (S01–S32).

### Design
| # | File | Covers |
|---|------|--------|
| 01 | [original-game-reference.md](design/01-original-game-reference.md) | What the originals actually had — the baseline to port |
| 02 | [core-gameplay.md](design/02-core-gameplay.md) | Movement, turret, cameras, damage, controls, pickups, destruction, HUD |
| 03 | [tanks-and-weapons.md](design/03-tanks-and-weapons.md) | Tank roster (with on-screen names), gangs, specials, power-ups, live numbers |
| 04 | [single-player-campaign.md](design/04-single-player-campaign.md) | Campaign structure, Scrap economy, missions, bosses, co-op, scoring |
| 05 | [multiplayer.md](design/05-multiplayer.md) | All modes (incl. Convoy), lobbies, quick match, ranked, rejoin, history, anti-cheat |
| 06 | [ai-behavior.md](design/06-ai-behavior.md) | Bot AI: architecture, archetypes, mode roles, difficulty — with build status |
| 07 | [progression-leveling.md](design/07-progression-leveling.md) | XP, levels, unlocks, perks, challenges, ranked rating, PvP fairness |
| 08 | [levels-and-maps.md](design/08-levels-and-maps.md) | Map design rules, map format as built, arenas, map editor |
| 15 | [decomp-findings.md](design/15-decomp-findings.md) | What the N64 decompilation says: countdown, unit/weapon/pickup numbers, destructibles, levels, gaps in Re-Tanx |

### Engineering
| # | File | Covers |
|---|------|--------|
| 09 | [technical-architecture.md](engineering/09-technical-architecture.md) | **As built**: sim, netcode, lag compensation, rejoin, topology, data model, testing, replays |
| 12 | [code-architecture.md](engineering/12-code-architecture.md) | **Code shape**: real module maps, enforced rules, definition of done |

### Planning
| # | File | Covers |
|---|------|--------|
| 10 | [roadmap.md](planning/10-roadmap.md) | Milestones with status and open questions |
| 11 | [implementation-plan.md](planning/11-implementation-plan.md) | Stack + phased checklists (ticked against the repo) |
| 13 | [implementation-status.md](planning/13-implementation-status.md) | **What's built right now** and what's open |

### Guides
| File | Covers |
|------|--------|
| [14-map-authoring-guide.md](guides/14-map-authoring-guide.md) | **Making arenas**: format, tile legend, destruction stages, art asset specs, design checklist |
| [self-hosting.md](guides/self-hosting.md) | **Running a server**: Docker Compose, environment variables, storage, sign-in, HTTPS, smoke test |
| [map-templates/](guides/map-templates/) | Starter arenas that pass every check (`starter-yard.json`) |

## Legal / IP note (read first)
BattleTanx, its characters (Griffin Spade, Madison, Cassandra), gang names, and assets are owned by the rights holder of the 3DO catalog. To keep a fan project defensible:
- **No ripped assets** — no ROM models, textures, audio, or music. ✅ Every model and sound is generated from code.
- **Rename** the game, characters, and gangs before public launch. ✅ Every original name is replaced on screen via `data/names.json`, and `scripts/check-ip.mjs` fails the build if one comes back. The docs still use the original names as *reference*:

  | Original | In game |
  |----------|---------|
  | QueenLord(s) | Oracle(s) |
  | Tank Bucks | Scrap |
  | Battlelord | Oracle Raid |
  | Family Mode | Rookie |
  | Hold 'Em | Keep Away |
  | the Edge | the Rift |
  | Moto / Goliath | Scout / Behemoth |
  | Rail Goliath | rail cannon |
  | Other tanks | Ranger, Skimmer, Torch, Viper, Ram, Lancer, Howitzer |

  ⏳ The **game title** "Re-Tanx" still echoes "BattleTanx". Pick the final one before going public.
- **Non-commercial** — no ads, sales, or paid unlocks.
- Keep the *mechanics* (not protectable as expression) and build original *expression* around them.

This isn't legal advice; it lowers takedown risk but doesn't eliminate it.

## Conventions
- Units: 1 unit = 1 meter. Time in seconds. Speeds in m/s.
- Numbers in these docs are **starting values for tuning**; the live values are in the repo's `data/*.json`. Where a doc table has been checked against the data it says so in its status line.
- "Original:" callouts mark behavior lifted from the N64 games; "Enhancement:" marks new design.
- ✅ = built and tested in the repo; ⏳ = planned, not built.
- Internal ids in code (`moto`, `battlelord`, `queen`) are not what players see; on-screen names come from `data/names.json`.
