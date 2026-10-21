# 03 — Tanks, Gangs, Weapons & Power-ups

All names below are placeholders mapped to original roles. Rename before launch.

## 3.1 Tank roster
Classes: **Light (L)**, **Medium (M)**, **Heavy (H)**, **Special (S)**.

| ID | Original analog | Class | HP | Armor | Speed | Main gun | DPS | Cost (Bucks) | Notes |
|----|-----------------|-------|----|-------|-------|----------|-----|--------------|-------|
| `moto` | Moto Tank | L | 60 | 1 | 16 | Twin MG (hitscan) | 30 | 5 | Small hitbox, fast |
| `m1` | M1A1 | M | 100 | 3 | 11 | Cannon 25 dmg / 1.0 s | 25 | 10 | All-rounder, campaign default |
| `goliath` | Goliath | H | 160 | 6 | 7 | Heavy cannon 45 dmg / 1.6 s, splash 3 m | 28 | 20 | Slow turret |
| `hover` | Hover Tank | S | 80 | 2 | 13 | Pulse cannon 18 / 0.6 s | 30 | 15 | Strafes, ignores rubble, +25% dmg taken |
| `inferno` | Inferno | M | 110 | 3 | 10 | Flamethrower 12 m, 45 DPS + burn | 45 | 15 | Short range bully |
| `rattler` | Rattler | L | 70 | 2 | 15 | Rocket pods (homing-lite) | 26 | 10 | Kiter |
| `rhino` | Rhino | H | 200 | 8 | 6 | Ram plow + cannon 35 / 1.4 s | 25 | 25 | Ram dmg ×2 |
| `flpe` | FLP-E | S | 90 | 3 | 12 | Laser (hitscan, overheats) | 35 | 20 | Overheat 4 s |
| `sentinel` | *(new)* | S | 120 | 4 | 8 | Artillery mortar, indirect, 600 ms travel | 22 | 20 | Deploy mode: immobile, +50% range |

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
| Queen's Guard | Madison's Militia (GA) | flpe ×2, moto, rattler, rhino | Guided Missile + Health |
| *(Hidden)* | Cheat-locked gang | sentinel ×2, flpe, hover, goliath | Edge Burst (unlock via progression or code) |

## 3.3 Special weapons
| ID | Name | Type | Damage | Stack max | Super threshold → effect |
|----|------|------|--------|-----------|--------------------------|
| `guided` | Guided Missile | Player-steered, 8 s fuel | 60, splash 4 m | 3 | 3 → triple warhead |
| `swarm` | Swarm Missiles | 4 homing per shot | 4×12 | 12 | 8 → 16-missile barrage |
| `mine` | Mines | Placed, arm 1 s, cloaked to enemies at >8 m | 50, splash 3 m | 6 | 6 → minefield ring around tank |
| `laser` | Laser Blast | Hitscan beam 0.5 s | 50 | 4 | 4 → piercing beam |
| `plasma` | Plasma Bolt | Slow projectile, big splash | 40, splash 6 m | 4 | 4 → bouncing bolt |
| `turret` | Sentry Turret | Placed, 60 HP, MG, 30 s | 10 DPS | 2 | — |
| `shock` | Shockwave | Radial 15 m, knockback | 30 | 2 | — |
| `nuke` | Nuke | 5 s fuse, map-wide falloff from detonation | 150 center → 20 edge; flattens structures in 40 m | 1 | — |
| `edge` | Edge Burst | Telekinetic push + stun 1.5 s | 25 | 1 | — |

## 3.4 Utility / power-ups
| ID | Effect | Duration | Respawn |
|----|--------|----------|---------|
| `star` | +15 HP, +1 special stock of current | — | Drop only |
| `health` | +50 HP (stored if full) | — | 25 s |
| `ammo` | Refill current special to max | — | 30 s |
| `shield` | Absorbs 80 dmg | Until depleted / 20 s | 40 s |
| `radar` | Show all tanks/objectives | 30 s (campaign) | 45 s |
| `speed` | +40% speed | 8 s | 30 s |
| `cloak` | Invisible beyond 10 m, breaks on fire | 12 s | 60 s |
| `teleport` | Blink 20 m forward | — | 45 s |
| `repair` | Drone heals 10 HP/s | 6 s | 45 s |
| `bucks` | +5 Tank Bucks | Campaign only | Fixed placements |
| `points` | +1000 score | Campaign only | Fixed placements |

Rare items (`nuke`, `edge`) spawn on long timers (90–120 s) at contested map positions with an audio sting on spawn.

## 3.5 Balance process
- Keep all values in `data/tanks.json`, `data/weapons.json`, `data/pickups.json`; hot-reloadable in dev.
- Log per-match telemetry: kills by weapon, tank pick rate, win rate by gang, average lifespan by tank.
- Rule of thumb: no gang above 55% or below 45% win rate in bot-free matches over 500+ games.
