# Project TREADLORD — BattleTanx Fan Port (Web)

> Working title. A browser-playable, fan-made homage to **BattleTanx** (N64, 1998) and **BattleTanx: Global Assault** (N64/PS1, 1999) by The 3DO Company.

## Vision
Fast, arcade tank combat in destructible post-apocalyptic cities. Pick a gang, roll a squad of five tanks, blow up everything. Faithful to the N64 feel (snappy arcade handling, chunky destruction, 4-player chaos), with modern additions: online play, bots that don't feel dumb, and light progression.

**Pillars**
1. **Arcade, not sim** — instant, readable, forgiving controls.
2. **Everything breaks** — buildings, cars, walls hide paths and pickups.
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
| 05 | [multiplayer.md](05-multiplayer.md) | All modes, lobbies, bots, split-screen + online |
| 06 | [ai-behavior.md](06-ai-behavior.md) | Enemy/bot AI: architecture, archetypes, tactics, difficulty |
| 07 | [progression-leveling.md](07-progression-leveling.md) | XP, levels, unlocks, perks, PvP fairness rules |
| 08 | [levels-and-maps.md](08-levels-and-maps.md) | Map design rules, destructibles, map list |
| 09 | [technical-architecture.md](09-technical-architecture.md) | Stack, netcode, server, data model, hosting |
| 10 | [roadmap.md](10-roadmap.md) | Milestones from prototype to 1.0 (high level) |
| 11 | [implementation-plan.md](11-implementation-plan.md) | **Build from this**: chosen stack, phased checklists, upgrade triggers |

## Legal / IP note (read first)
BattleTanx, its characters (Griffin Spade, Madison, Cassandra), gang names, and assets are owned by the rights holder of the 3DO catalog. To keep a fan project defensible:
- **No ripped assets** — no ROM models, textures, audio, or music. Build everything original.
- **Rename** the game, characters, and gangs before public launch (original names are used in these docs as *reference only*).
- **Non-commercial** — no ads, sales, or paid unlocks.
- Keep the *mechanics* (not protectable as expression) and build original *expression* around them.

This isn't legal advice; it lowers takedown risk but doesn't eliminate it.

## Conventions
- Units: 1 unit = 1 meter. Time in seconds. Speeds in m/s.
- Numbers in these docs are **starting values for tuning**, not final.
- "Original:" callouts mark behavior lifted from the N64 games; "Enhancement:" marks new design.
