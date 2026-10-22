# 06 — AI Behavior (Enemies, Bots & Allies)

> **Status (Oct 2026, through S29):** see §6.12 for what's built. Player-facing names: QueenLord → Oracle, Battlelord → Oracle Raid, rail Goliath → rail cannon (`data/names.json`).

Goal: AI that's **readable and beatable** but doesn't feel brain-dead. The originals' AI was simple and predictable; we want variety through archetypes and light coordination, not perfect aim.

## 6.1 Architecture
Three layers, ticked at different rates:

```
Squad Director (1 Hz)   — assigns roles & goals to groups
   └─ Tank Brain (5 Hz) — utility AI picks a behavior
        └─ Motor (every tick) — steering, aiming, firing
```

- **Squad Director**: per team/faction. Reads the world (threats, objectives, pickups) and assigns goals ("attack carrier", "defend base", "flank north"). In the campaign it's the mission script's puppet.
  - *As built:* a stable per-tank role (`roleOf`: 40% attack, 40% defend, 20% roam) plus `objectiveGoal`, which turns the mode's state into a goal for each bot. There is no separate 1 Hz director process yet.
- **Tank Brain**: **utility AI**. Each candidate behavior gets a score from considerations (health, distance, ammo, threat, goal); the highest wins, with hysteresis (+15% to the current behavior) to prevent flip-flopping. ✅ Runs at 5 Hz (`data/ai.json → thinkHz, hysteresis`).
- **Motor**: steering on a grid-A* path, aim controller with per-difficulty error, stuck detection (reverse + turn). ✅

The server runs all AI (authoritative). Budget: ≤ 2 ms per tick for 24 AI tanks.

## 6.2 Perception
| Sense | Rule | Built |
|-------|------|-------|
| **Vision** | 70 m cone of 120° (turret-facing), raycast line of sight, re-checked at 5 Hz | ✅ |
| **Hearing** | Gunfire heard 60 m, explosions 120 m — creates an "investigate" point | ✅ |
| **Damage** | Being hit reveals the attacker's position instantly | ✅ |
| **Shared knowledge** | Squad shares sightings with 1 s delay | ⏳ |
| **Memory** | Last-known position kept 8 s; then searches, then forgets | ✅ |

Cloak: invisible beyond 10 m unless the target fires. Radar pickup doesn't help AI (fairness).

## 6.3 Behaviors (Tank Brain)
| Behavior | When it scores high | What it does | Built |
|----------|---------------------|--------------|-------|
| **Patrol** | No known threats | Roam; idle bots hunt via radar so matches never stall | ✅ |
| **Investigate** | Heard noise, lost target | Move to point, scan | ✅ |
| **Engage** | Target visible, healthy | Preferred range for its weapon, strafe, fire (attack tokens) | ✅ |
| **Flank** | Target engaged by ally, path to side/rear exists | Route to the target's rear arc (×1.3 dmg) | ⏳ |
| **Take Cover** | Taking fire, cover nearby | Move behind a structure relative to the threat | ⏳ |
| **Retreat** | HP < archetype threshold | Fall back toward allies or health | ✅ |
| **Seek Pickup** | Pickup within 30 m and useful | Grab it | ✅ |
| **Use Special** | Special in inventory and situation fits (6.5) | Fire special; guided missiles are steered by a pilot | ✅ |
| **Ram** | Heavy/Rhino, target light & close | Charge | ⏳ |
| **Objective** | Mode goal (carry Oracle, escort, defend, core, convoy, zone) | Pursue objective; overrides most else when weighted | ✅ |
| **Follow** | Wingman with a leader | Stay 10–20 m behind, regroup, yield path | ✅ |
| **Escape** | Campaign runner | Flee to an exit marker | ✅ |
| **Destroy Cover** | Target hiding behind destructible | Shoot the wall instead | ⏳ |

## 6.4 Archetypes (personalities)
Same brain, different weights. Assigned by tank type (`data/ai.json → archetypeByTank`). Built ✅: Raider, Brawler, Line, Bulwark, Artillery. Not built ⏳: Trickster, Kamikaze.

| Archetype | Typical tank (display name) | Personality |
|-----------|--------------|-------------|
| **Raider** | moto (Scout), rattler (Viper), hover (Skimmer) | Fast in/out, retreats early (HP 40%), harasses |
| **Brawler** | inferno (Torch), rhino (Ram) | Closes distance, ignores cover |
| **Line** | m1 (Ranger), flpe (Lancer) | Balanced; holds mid range |
| **Bulwark** | goliath (Behemoth), warlord | Slow advance, holds ground |
| **Artillery** | sentinel (Howitzer) | Stays far, deploys |
| **Trickster** ⏳ | hover, Black Halos | Mines, cloak, guided missiles around corners |
| **Kamikaze** ⏳ *(campaign only)* | rigged moto | Rushes, explodes on contact; strong audio tell |

## 6.5 Special weapon usage rules
- **Guided missile**: only when the target is out of direct LOS but reachable; the AI "steers" along the path (no cheating). ✅
- **Mines**: drop at chokepoints when retreating, or near own Oracle.
- **Swarm**: target at mid range, in the open.
- **Nuke**: when ≥ 2 enemies within 30 m of a point and the AI can escape the radius before the fuse ends; never on own base.
- **Shield**: when HP < 60% and under fire.
- **Super shot**: if threshold met and expected hits ≥ 2.

All of these are implemented in `sim/ai/specials.ts` ✅.

## 6.6 Squad tactics (Director)
- **Pincer** ⏳: 2+ tanks vs a single target → one engages from the front, others flank.
- **Focus fire** ✅ (partial): attack tokens cap shooters per target; carriers are chased with priority.
- **Bait & ambush** ⏳ (Hard+).
- **Fallback** ⏳: regroup at a rally point after losing > 50%.
- **Reinforcement waves** ✅ in the campaign: triggered waves enter from enemy spawn markers.

## 6.7 Mode-specific bot logic (multiplayer)
| Mode | Bot roles | Built |
|------|-----------|-------|
| Deathmatch / Tank Wars / Rookie / Last Gang Standing | Hunt nearest/weakest; seek pickups between fights | ✅ |
| Annihilation | More cautious: retreat threshold +15%; protect last tanks | ✅ (shared engage/retreat) |
| Oracle Raid (Battlelord) | Role split ~40% attack, 40% defend, 20% roam. Attackers steal, defenders rescue and guard, everyone chases carriers. **Defenders man a free rail cannon** (go to the track, park, fight from it). Carriers head home | ✅ |
| Frenzy | Rush the neutral Oracle; nearest grabs, others intercept the carrier | ✅ |
| **Convoy** | **Protectors** go to the nearest truck when > 12 m away, so trucks keep rolling (they need a protector within 25 m). **Attackers** set up 3 waypoints ahead of the lead truck on its road; **roamers** chase the lead truck. Any truck in sight is a normal enemy target | ✅ *(S29)* |
| Keep Away (Hold 'Em) | Carrier runs to the spawn farthest from enemies; others escort or hunt the carrier | ✅ |
| King of the Rubble | Hold the zone (roamers less eager) | ✅ |
| Siege | Attackers drive to and shell the core; defenders return when > 25 m away | ✅ |
| Horde | Waves follow the spawn budget (6.9) | ✅ |

Bots get names and a visible "bot" tag on results. They never use information a human couldn't have. In online matches, a bot that takes over a disconnected player's tank plays until that player rejoins (doc 05 §5.4).

## 6.8 Ally / wingman AI (campaign & co-op)
- ✅ Default Follow: stay 10–20 m behind the leader, engage threats, yield the path within 6 m, hold still if the leader dies between thinks.
- ⏳ Commands (quick-chat wheel): **Hold here**, **Attack my target**, **Free hunt**.
- Must be **useful** (a weakness of the originals): wingmen deal ~60% of a player's damage, retreat sensibly, and pick up health only when the player is above 50% HP.

## 6.9 Difficulty scaling
| Knob | Easy | Normal | Hard | Battlelord |
|------|------|--------|------|-----------|
| Reaction time | 0.8 s | 0.5 s | 0.3 s | 0.2 s |
| Aim error (deg) | 9 | 5 | 2.5 | 1.5 |
| Leads moving targets | No | 50% | Yes | Yes |
| Uses flanking | Rarely | Sometimes | Often | Coordinated |
| Uses specials | Basic only | Most | All + super shots | All, optimal |
| Max simultaneous attackers on player | 2 | 3 | 4 | Unlimited |

**Attack token system** ✅: only N AI may actively fire at a given player at once (table above); others reposition.

**Dynamic difficulty** ⏳ (campaign, optional toggle): after 3 deaths on a mission, reduce aim accuracy 15% and attackers by 1 on retry.

Horde/wave budget ✅: `budget = 10 + wave × 6 × playerCount^0.8`, where light=1, medium=2, heavy=3, special=3 points.

## 6.10 Navigation
- ✅ **A\* on the map's 10 m grid** (`sim/ai/nav/grid.ts`). Rubble costs ×1.5; water blocks everything but hovers. Paths are replanned on a timer and when the goal moves. Goals inside buildings snap to the nearest open cell.
- ✅ Convoy roads use the same A* at round start.
- ⏳ Local avoidance (RVO/separation); tank collisions push apart instead.

## 6.11 Debugging tools
⏳ Dev overlay (perception cones, behavior scores, paths, tokens). Every match can already be **replayed exactly** (doc 09 §9.11), which covers most "why did that bot do that" questions.

## 6.12 As built — summary
Utility brain at 5 Hz with hysteresis · perception (vision, hearing, damage, memory) · attack tokens · 5 archetypes · grid A* · guided-missile pilot and special-use rules · mode objectives for every mode, including the rail cannon and Convoy · wingmen · campaign runners · bosses (3 phases, telegraphed strikes, adds). Not yet: Squad Director as its own layer, flank/cover/ram/destroy-cover, Trickster/Kamikaze, wingman commands, dynamic difficulty, debug overlay.
