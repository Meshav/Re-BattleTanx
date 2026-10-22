# 03 — Tanks, Gangs, Weapons & Power-ups

> **Status (Oct 2026, S32):** every tank, gang, special and pickup below is built. The tables match the live numbers in `data/tanks.json`, `data/gangs.json`, `data/specials.json` and `data/pickups.json`. Internal ids (`moto`, `goliath`, …) are code and never reach the screen; players see the names from `data/names.json`, shown in brackets.

## 3.1 Tank roster
Classes: **Light (L)**, **Medium (M)**, **Heavy (H)**, **Special (S)**, plus two AI-only kinds.

| ID (on screen) | Original analog | Class | HP | Armor | Speed | Main gun | DPS | Cost (Scrap) | Notes |
|----|-----------------|-------|----|-------|-------|----------|-----|--------------|-------|
| `moto` (Scout) | Moto Tank | L | 60 | 1 | 16 | Twin MG (hitscan) | 30 | 5 | Small hitbox, fast |
| `m1` (Ranger) | M1A1 | M | 100 | 3 | 11 | Cannon 25 dmg / 1.0 s | 25 | 10 | All-rounder, campaign default |
| `goliath` (Behemoth) | Goliath | H | 160 | 6 | 7 | Heavy cannon 45 dmg / 1.6 s, splash 3 m | 28 | 20 | Slow turret |
| `hover` (Skimmer) | Hover Tank | S | 80 | 2 | 13 | Pulse cannon 18 / 0.6 s | 30 | 15 | Strafes, glides over rubble and water, +25% dmg taken |
| `inferno` (Torch) | Inferno | M | 110 | 3 | 10 | Flamethrower 12 m cone, 45 DPS + burn (5/s for 2 s) | 45 | 15 | Short range bully |
| `rattler` (Viper) | Rattler | L | 70 | 2 | 15 | Rocket pods (homing-lite, 13 / 0.5 s) | 26 | 10 | Kiter |
| `rhino` (Ram) | Rhino | H | 200 | 8 | 6 | Ram plow + cannon 35 / 1.4 s | 25 | 25 | Ram dmg ×2 |
| `flpe` (Lancer) | FLP-E | S | 90 | 3 | 12 | Laser (hitscan, heat gauge) | 35 | 20 | Overheat locks the gun 4 s |
| `sentinel` (Howitzer) | *(new)* | S | 120 | 4 | 8 | Mortar 40 / 1.8 s, arcs over buildings, splash 5 m | 22 | 20 | Parked 1 s: ×1.5 range |
| `warlord` (Warlord) | *(new)* | boss | 900 | 7 | 5.5 | Cannon 40 / 1.2 s, splash 3.5 m | 33 | — | Campaign and Horde boss; rear hits ×2; not playable |
| `truck` (Truck) | *(new)* | convoy | 260 | 3 | 6 | none | 0 | — | Convoy cargo; AI-driven, never selectable (doc 05 §5.2) |

Tune with the triangle in mind: **Light flanks Heavy**, **Heavy out-trades Medium head-on**, **Medium catches Light**.

## 3.2 Gangs
Each gang = 5-tank roster + signature item + stat flavor. Players pick a gang in MP; roster cycles in random order on death (Original) except Annihilation (pick freely).

| Gang (placeholder) | Original analog | Roster | Signature |
|--------------------|-----------------|--------|-----------|
| Iron Hounds | Griffin's Army | m1 ×3, goliath, hover | Random special |
| Atomic Paladins | Nuclear Knights | goliath ×2, m1 ×2, rhino | Nuke (1 per match outside Annihilation) |
| Bone Riders | Skull Riderz | moto ×3, rattler ×2 | Speed Boost |
| Faultline | After Shocks | m1 ×2, rhino, goliath ×2 | Shockwave |
| Rust Saints | Urban Decay | inferno ×2, m1 ×2, moto | Mines |
| Echo Company | Charlie Co. | m1 ×2, sentinel, goliath, rattler | Sentry Turret |
| Black Halos | Dark Angels | hover ×2, flpe ×2, moto | Cloak |
| Gear Fiends | Mech Maniacs | rhino ×2, inferno, goliath ×2 | Repair Drone |
| Mad Battalion | Psycho Brigade | moto ×2, inferno ×2, rattler | Swarm Missiles |
| Queen's Guard | Madison's Militia (GA) | flpe ×2, moto, rattler, rhino | Guided Missile |
| Riftborn *(hidden; id `edgeborn`)* | Cheat-locked gang | sentinel ×2, flpe, hover, goliath | Edge Burst — unlocks at level 30 (doc 07) |

Gangs unlock by level (doc 07 §7.3); the server enforces it online. The Atomic Paladins' nuke is one per match.

## 3.3 Special weapons
| ID | Name | Type | Damage | Stack max | Super threshold → effect |
|----|------|------|--------|-----------|--------------------------|
| `guided` | Guided Missile | Player-steered, 8 s fuel | 60, splash 4 m | 3 | 3 → triple warhead |
| `swarm` | Swarm Missiles | 4 homing per shot | 4×12 | 12 | 8 → 16-missile barrage |
| `mine` | Mines | Placed, arm 1 s, cloaked to enemies at >8 m | 50, splash 3 m | 6 | 6 → minefield ring around tank |
| `laser` | Laser Blast | Hitscan beam, 80 m | 50 | 4 | 4 → piercing beam through every tank on the line, ×1.5 dmg |
| `plasma` | Plasma Bolt | Slow projectile, big splash | 40, splash 6 m | 4 | 4 → 3-bolt fan |
| `turret` | Sentry Turret | Placed, 60 HP, MG, 30 s | 10 DPS | 2 | — |
| `shock` | Shockwave | Radial 15 m, knockback | 30 | 2 | — |
| `nuke` | Nuke | 5 s fuse, map-wide falloff from detonation | 150 center → 20 edge; flattens structures in 40 m | 1 | — |
| `edge` | Edge Burst (shown as the Rift) | Telekinetic push + stun 1.5 s, 18 m | 25 | 1 | — |

Attack specials also appear as map pickups (letters in doc 14 §3): a crate gives 2 guided / 4 swarm / 3 mines / 2 laser / 2 plasma / 1 of anything else, and respawns in 30 s (guided, swarm, mines) or 40 s (the rest). Bots pick specials by difficulty (`data/ai.json`).

## 3.4 Utility / power-ups
| ID | Effect | Duration | Respawn |
|----|--------|----------|---------|
| `star` | +15 HP, +1 special stock of current | — | Drop only; fades after 20 s |
| `health` | +50 HP (stored as a kit if full, max 3) | — | 25 s |
| `ammo` | Refill current special to max | — | 30 s |
| `shield` | Absorbs 80 dmg | Until depleted / 20 s | 40 s |
| `speed` | +40% speed (stack 2) | 8 s | 40 s |
| `cloak` | Invisible beyond 10 m, breaks on fire; bots and turrets can't see you (stack 2) | 12 s | 40 s |
| `teleport` | Blink 20 m forward, stops short of walls (stack 2) | — | 40 s |
| `repair` | Drone heals 10 HP/s (stack 2) | 6 s | 40 s |
| `*` | One random special; the spot re-rolls each respawn | — | 30 s |
| `bucks` | +5 Scrap | Campaign only | Fixed placements |
| `radar` ⏳ | Show all tanks/objectives | — | Not built: the minimap is always on (Original MP rule) |
| `points` ⏳ | +1000 score | — | Not built |

Rare items (`nuke`, `edge`) respawn every 120 s; put them at contested, exposed positions (doc 14 §7). ⏳ Audio sting on spawn.

## 3.5 Balance process
- ✅ All values live in `data/tanks.json`, `data/specials.json`, `data/pickups.json`, `data/gangs.json`; Vite reloads them in dev.
- ⏳ Per-match telemetry (kills by weapon, tank pick rate, win rate by gang, lifespan by tank). Match history (doc 05 §5.4) records mode, arena, gang, kills, deaths and place per player, which is a start.
- Rule of thumb: no gang above 55% or below 45% win rate in bot-free matches over 500+ games.
