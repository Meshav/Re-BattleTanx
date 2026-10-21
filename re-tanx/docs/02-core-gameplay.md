# 02 — Core Gameplay

## 2.1 Tank movement
Arcade model, not physics-sim. Kinematic controller with simple collision response.

| Param | Light | Medium | Heavy |
|-------|-------|--------|-------|
| Max forward speed | 16 m/s | 11 m/s | 7 m/s |
| Reverse speed | 60% of forward | 50% | 45% |
| Acceleration (0→max) | 0.6 s | 1.0 s | 1.6 s |
| Hull turn rate | 140°/s | 95°/s | 60°/s |
| Turret turn rate | 220°/s | 160°/s | 110°/s |

- **Tank-style steering**: left/right rotates hull in place or while moving; no strafing (except Hover class).
- **Collision**: slide along walls; ram damage = `mass_ratio × closing_speed × 2` above 6 m/s closing speed.
- **Terrain**: flat-ish city grid; ramps/rubble allowed; tanks align to ground normal, no flipping.
- **Hover class**: can strafe, ignores rubble/water slowdown, takes +25% damage.

## 2.2 Control schemes
Original had four; we keep the concept, adapted for keyboard/mouse, gamepad, and touch.

| Scheme | Hull | Turret | Best for |
|--------|------|--------|----------|
| **Arcade** (default KB/M) | WASD | Mouse-aim, independent | PC players |
| **Classic** | Stick/WASD | Locked forward; small auto-aim cone | N64 feel, new players |
| **Twin-stick** (default gamepad) | Left stick | Right stick | Controllers |
| **Easy** | Left stick moves in camera-relative direction (tank auto-turns) | Auto-aims nearest target in cone | Kids / Family Mode / touch |

Rebindable. Gamepad via the Gamepad API. Touch: dual virtual sticks + fire/special buttons.

**Default bindings (KB/M):** WASD move · Mouse aim · LMB main gun · RMB special · Q/E cycle special · Tab cycle tank (where mode allows) · Space handbrake/boost (if boost held) · V camera toggle · Shift steer guided missile (hold).

## 2.3 Camera
- **Chase cam** (default): behind and above, smoothed follow, looks toward turret aim.
- **Hatch cam**: first-person from the commander's hatch (original had this).
- **Tactical cam** *(Enhancement)*: higher, slightly top-down; better on mobile.
- Camera pushes in when occluded; buildings between camera and tank fade to 30% opacity.
- Guided missile: camera switches to missile while steering; tank keeps last input (vulnerable).

## 2.4 Health, armor, damage
- Each tank has **HP** and an **armor value** (flat reduction per hit, min 1 damage).
- **Directional armor** *(Enhancement, light)*: rear hits ×1.3, side ×1.1, front ×1.0. Rewards flanking without sim complexity.
- **Splash**: explosives use linear falloff from center to radius.
- **Death**: tank explodes (splash 6 m, 20 dmg), drops a **Star** pickup and its held special (if any).
- **Self-damage**: 50% from own splash.
- **Friendly fire**: off by default; on in "Hardcore" lobby option.

## 2.5 Weapons model
Every tank has:
1. **Main gun** — infinite ammo, fire-rate limited, unique per tank (cannon, MGs, flamer, etc.).
2. **Special slot** — inventory of pickups, cycle with Q/E. Each special has stack count.
3. **Gang signature** — item every tank of that gang spawns with.

**Super shot** (Original): firing a special while holding ≥ its super threshold (e.g. 6 swarm missiles) fires an enhanced volley consuming all stock. Show a glowing "SUPER" badge on HUD when available.

Projectile types: hitscan (MG, laser), ballistic (cannon shells with slight arc), homing (swarm), player-steered (guided), placed (mines, turrets), area (nuke).

## 2.6 Pickups
Floating boxes on fixed spawn points; respawn timers per type (see doc 03). Destroying objects can reveal hidden pickup spawns. Pickups bob and rotate; icons readable at distance.

Full health picked up while full → stored in inventory as a usable item (Original).

## 2.7 Destructible environment
Core to the identity. Three tiers:

| Tier | Examples | Behavior |
|------|----------|----------|
| **Debris** | Cars, lampposts, fences, barrels | Breaks in 1–2 hits; barrels explode; cars become wrecks (low cover) |
| **Structures** | Shops, walls, kiosks, small buildings | HP pool; staged collapse (intact → damaged → rubble); rubble is passable but slows |
| **Landmarks** | Tall buildings, bridges | Partial destruction only (facade chunks); some scripted full collapses in campaign |

- Destruction is **server-authoritative** and synced as state changes (object ID + stage), not physics.
- Secret paths: walls marked `hiddenPath` open routes when destroyed.
- Destruction resets each match.

## 2.8 HUD
- Health bar + armor pips, current tank icon, squad roster (5 slots with alive/dead state).
- Special inventory carousel with counts and SUPER badge.
- Radar/minimap (always on in MP; pickup in campaign).
- Objective tracker (QueenLord status, convoy progress, kills to win).
- Hit markers, damage direction indicators, kill feed.

## 2.9 Feel / juice checklist
Screen shake scaled to distance, muzzle flash, track marks, smoke at low HP, chunky explosions, satisfying building collapse sound, hit-stop of 40 ms on kills. Snappy beats realistic.
