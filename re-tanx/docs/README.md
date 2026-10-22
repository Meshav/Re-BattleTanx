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

## Document index
| # | File | Covers |
|---|------|--------|
| 01 | [original-game-reference.md](01-original-game-reference.md) | What the originals actually had — the baseline to port |
| 02 | [core-gameplay.md](02-core-gameplay.md) | Movement, turret, camera, damage, controls, pickups, destruction |
| 03 | [tanks-and-weapons.md](03-tanks-and-weapons.md) | Tank roster, gangs, weapons, power-ups, balance numbers |
| 04 | [single-player-campaign.md](04-single-player-campaign.md) | Campaign structure, missions, Tank Bucks, co-op |
| 05 | [multiplayer.md](05-multiplayer.md) | All modes (incl. Convoy), lobbies, quick match, ranked, rejoin, history, anti-cheat |
| 06 | [ai-behavior.md](06-ai-behavior.md) | Bot AI: architecture, archetypes, mode roles, difficulty — with build status |
| 07 | [progression-leveling.md](07-progression-leveling.md) | XP, levels, unlocks, perks, ranked rating, PvP fairness rules |
| 08 | [levels-and-maps.md](08-levels-and-maps.md) | Map rules, map format as built, arenas, map editor |
| 09 | [technical-architecture.md](09-technical-architecture.md) | **As built**: netcode, lag compensation, rejoin, topology, data model, testing, replays |
| 10 | [roadmap.md](10-roadmap.md) | Milestones with status |
| 11 | [implementation-plan.md](11-implementation-plan.md) | Stack + phased checklists (ticked against the repo) |
| 12 | [code-architecture.md](12-code-architecture.md) | **Code shape**: real module maps, enforced rules, definition of done |
| 13 | [implementation-status.md](13-implementation-status.md) | **What's built right now** and what's open |
| 14 | [map-authoring-guide.md](14-map-authoring-guide.md) | **Making arenas**: format, tile legend, destruction stages, art asset specs, design checklist, starter template |

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
- Numbers in these docs are **starting values for tuning**; the live values are in the repo's `data/*.json`.
- "Original:" callouts mark behavior lifted from the N64 games; "Enhancement:" marks new design.
- ✅ = built and tested in the repo; ⏳ = planned, not built.
