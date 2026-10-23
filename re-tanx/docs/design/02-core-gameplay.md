# 02 — Core Gameplay

> **Status (Oct 2026, S32):** movement, damage, weapons, pickups and structures are built as described below; the tables were checked against `data/tanks.json` and `data/rules.json`. Items marked ⏳ are design only.

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
| **Easy** ⏳ | Left stick moves in camera-relative direction (tank auto-turns) | Auto-aims nearest target in cone | Kids / Rookie / touch |

Built ✅: Arcade (keyboard + mouse, player 1), Classic (arrow keys, a second keyboard player), Twin-stick (up to 4 gamepads via the Gamepad API) and touch (two virtual sticks, push the aim stick to the rim to auto-fire, plus Fire / Special / Next / Camera buttons; auto-selected on phones and tablets). ⏳ The Easy scheme.

Player 1's keys are rebindable in Settings (move, fire, special, previous/next special, camera).

**Default bindings (KB/M):** WASD move · Mouse aim · LMB or Space main gun · RMB or F special · Q/E cycle special · V camera · Esc pause. Hover tanks: A/D strafe and the hull turns to face the aim. Guided missile: the hull freezes and the steering keys fly the missile. ⏳ Tank cycling and a handbrake/boost key.

## 2.3 Camera
- **Chase cam** ✅ (default): behind and above the hull, smoothed follow.
- **Cockpit cam** ✅ (the original's hatch view): just behind and above the turret hatch, follows the hull so mouse aim doesn't spin it.
- **Top-down cam** ✅ *(Enhancement)*: high and slightly tilted (the "tactical" rig); better on mobile.
- V (or a gamepad's Back button, `.` for the arrow-key player) cycles chase → cockpit → top-down.
- Buildings between camera and tank fade ✅. ⏳ Camera push-in when occluded.
- Guided missile ✅: camera switches to the missile while steering; the hull is frozen (vulnerable).

## 2.4 Health, armor, damage
- Each tank has **HP** and an **armor value** (flat reduction per hit, min 1 damage).
- **Directional armor** *(Enhancement, light)*: rear hits ×1.3, side ×1.1, front ×1.0. Rewards flanking without sim complexity.
- **Splash**: explosives use linear falloff from center to radius.
- **Death**: tank explodes (a 6 m visual blast, no damage), drops a **Star** pickup and its selected special stack as loot (both fade after 20 s).
- **Self-damage**: 50% from own splash.
- **Friendly fire**: off. Suicides and team kills cost a point in kill-count modes. ⏳ "Hardcore" lobby option.

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

As built ✅: the **Structures** tier — `#` buildings (300 HP) and `w` walls (120 HP, about three hits), three stages each (intact → damaged at 50% → rubble), rubble passable at 60% speed (hovers aren't slowed). Campaign targets (220 HP) and the Siege core (2500 HP) use the same stages. ⏳ Debris props and Landmarks wait for the art kit (doc 14 §6).

- Destruction is **server-authoritative** and synced as state changes (structure index + stage), not physics. ✅
- Secret paths: a single `w` wall blocking a shortcut between lanes; destroying it opens the route (doc 14 §7). ✅
- Destruction resets each match. ✅

## 2.8 HUD
- Health bar + armor pips, current tank icon, squad roster (5 slots with alive/dead state).
- Special inventory carousel with counts and SUPER badge.
- Radar/minimap (always on in MP; pickup in campaign).
- Objective tracker (QueenLord status, convoy progress, kills to win).
- Kill feed ✅; status line (burn / stun / cloak / boost / repair) and a heat gauge for lasers ✅; boss health bar with phase ✅. ⏳ Hit markers, damage direction indicators.
- Compact layout on small screens; one HUD per split-screen viewport. ✅
- **Pre-match count-in** ✅ (Original): every local, campaign and online match opens with the arena or mission title, then 3-2-1 and GO! (3 s, nothing moves or scores, beeps per digit). Timing in `data/rules.json` `countdown`; original timeline in doc 15 §15.2.

## 2.9 Feel / juice checklist
✅ Screen shake scaled to distance (off with reduced motion), muzzle flash and tracers, chunky explosions, building crumble/collapse sounds, nuke flash. ⏳ Track marks, smoke at low HP, 40 ms hit-stop on kills. Snappy beats realistic.
