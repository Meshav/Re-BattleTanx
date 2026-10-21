# 06 — AI Behavior (Enemies, Bots & Allies)

Goal: AI that's **readable and beatable** but doesn't feel brain-dead. The originals' AI was simple and predictable; we want variety through archetypes and light coordination, not perfect aim.

## 6.1 Architecture
Three layers, ticked at different rates:

```
Squad Director (1 Hz)   — assigns roles & goals to groups
   └─ Tank Brain (5 Hz) — utility AI picks a behavior
        └─ Motor (every tick) — steering, aiming, firing
```

- **Squad Director**: per team/faction. Reads the world (threats, objectives, pickups), assigns goals ("attack carrier", "defend base", "flank north"). In campaign it's the mission script's puppet.
- **Tank Brain**: **utility AI** — each candidate behavior gets a score from considerations (health, distance, ammo, threat, goal); highest wins, with hysteresis (+15% bonus to current behavior) to prevent flip-flopping.
- **Motor**: steering behaviors (seek, arrive, avoid, separation) on top of a navmesh path; aim controller with configurable error.

Server runs all AI (authoritative). Budget: ≤ 2 ms per tick for 24 AI tanks.

## 6.2 Perception
| Sense | Rule |
|-------|------|
| **Vision** | 70 m cone of 120° (turret-facing), raycast line of sight, re-checked at 5 Hz |
| **Hearing** | Gunfire heard 60 m, explosions 120 m — creates "investigate" point |
| **Damage** | Being hit reveals attacker position instantly |
| **Shared knowledge** | Squad shares sightings with 1 s delay |
| **Memory** | Last-known position kept 8 s; then searches, then forgets |

Cloak: invisible beyond 10 m unless the target fires. Radar pickup doesn't help AI (fairness).

## 6.3 Behaviors (Tank Brain)
| Behavior | When it scores high | What it does |
|----------|---------------------|--------------|
| **Patrol** | No known threats | Follow waypoints / roam |
| **Investigate** | Heard noise, lost target | Move to point, scan |
| **Engage** | Target visible, healthy | Move to preferred range for its weapon, strafe-orbit, fire |
| **Flank** | Target engaged by ally, path to side/rear exists | Route to target's rear arc (×1.3 dmg) |
| **Take Cover** | Taking fire, cover nearby | Move behind structure/wreck relative to threat |
| **Retreat** | HP < 30% | Fall back toward allies or health pickup |
| **Seek Pickup** | Pickup within 30 m and useful (health when low, specials when empty) | Grab it |
| **Use Special** | Special in inventory and situation fits (see 6.5) | Fire special |
| **Ram** | Heavy/Rhino, target light & close | Charge |
| **Objective** | Director goal (carry QueenLord, escort, defend) | Pursue objective; overrides most else when weighted |
| **Destroy Cover** | Target hiding behind destructible | Shoot the wall instead |

## 6.4 Archetypes (personalities)
Same brain, different weights. Assigned by tank type and gang flavor.

| Archetype | Typical tank | Personality |
|-----------|--------------|-------------|
| **Raider** | moto, rattler | Fast in/out, prefers flanks, retreats early (HP 40%), harasses |
| **Brawler** | inferno, rhino | Closes distance, rams, ignores cover |
| **Line** | m1 | Balanced; holds mid range, uses cover |
| **Bulwark** | goliath | Slow advance, holds chokepoints, protects allies |
| **Sniper/Artillery** | sentinel, flpe | Stays far, deploys, relocates after 3 shots |
| **Trickster** | hover, Black Halos | Uses mines, cloak, guided missiles around corners |
| **Kamikaze** *(campaign only)* | rigged moto | Rushes, explodes on contact; strong audio tell |

## 6.5 Special weapon usage rules
- **Guided missile**: only when target out of direct LOS but reachable by path; AI "steers" along the navmesh path (cheat-free simulation of player steering).
- **Mines**: drop at chokepoints when retreating, or near own QueenLord.
- **Swarm**: target at mid range, in the open.
- **Nuke**: when ≥ 2 enemies within 30 m of a point and AI can escape the radius before fuse ends; never on own base.
- **Shield**: when HP < 60% and under fire.
- **Super shot**: if threshold met and expected hits ≥ 2.

## 6.6 Squad tactics (Director)
- **Pincer**: 2+ tanks vs a single target → one engages from front, others flank.
- **Focus fire**: target lowest-HP visible enemy, or the QueenLord carrier, with priority.
- **Bait & ambush** (Hard+): a Raider pulls the player toward hidden Bulwarks.
- **Fallback**: if squad loses > 50%, regroup at a rally point and wait for reinforcements.
- **Reinforcement waves** in campaign: spawn out of player sight, enter from map edges.

## 6.7 Mode-specific bot logic (multiplayer)
| Mode | Bot roles |
|------|-----------|
| Deathmatch / Tank Wars | Hunt nearest/weakest; seek pickups between fights |
| Annihilation | More cautious: retreat threshold +15%; protect last tanks |
| Battlelord | Director splits team: ~40% attack, 40% defend, 20% roam/intercept carriers. Defenders use rail Goliath. Carrier bot routes avoid known threats; escorts follow carrier |
| Frenzy | All rush spawn point; nearest to queen grabs, others escort or intercept |
| Convoy | Protectors stay within 25 m of trucks, screen attackers; attackers ambush ahead along the path |
| Hold 'Em | Non-carriers either escort carrier or hunt enemy carrier |
| Horde | Waves follow Director spawn budget (see 6.9) |

Bots get human-like names and visible "BOT" tag. They never use information a human couldn't have.

## 6.8 Ally / wingman AI (campaign & co-op)
- Commands (quick-chat wheel): **Follow**, **Hold here**, **Attack my target**, **Free hunt**.
- Default Follow: stay 10–20 m behind player, engage targets that threaten the player.
- Must be **useful** (a weakness of the originals): wingmen deal ~60% of a player's damage, retreat sensibly, and pick up health only when the player is above 50% HP.
- Never block the player: yield path when player approaches within 6 m.

## 6.9 Difficulty scaling
| Knob | Easy | Normal | Hard | Battlelord |
|------|------|--------|------|-----------|
| Reaction time | 0.8 s | 0.5 s | 0.3 s | 0.2 s |
| Aim error (deg) | 9 | 5 | 2.5 | 1.5 |
| Leads moving targets | No | 50% | Yes | Yes |
| Uses flanking | Rarely | Sometimes | Often | Coordinated |
| Uses specials | Basic only | Most | All + super shots | All, optimal |
| Max simultaneous attackers on player | 2 | 3 | 4 | Unlimited |

**Attack token system**: only N AI may actively fire at a given player at once (table above); others reposition. Keeps fights fair and readable without making AI look dumb.

**Dynamic difficulty** (campaign, optional toggle): if player dies 3× on a mission, reduce aim accuracy 15% and attackers by 1 on retry.

Horde/wave budget: `budget = 10 + wave × 6 × playerCount^0.8`, where light=1, medium=2, heavy=3, special=3 points.

## 6.10 Navigation
- **A\* on the map's 10 m grid** (maps are grid cities). Recast navmesh only if maps stop being grids (doc 11 §11.4).
- **Destruction updates**: when a structure becomes rubble, mark its cells walkable with cost ×1.5 and invalidate cached paths that cross them.
- Hover class uses its own cost table, so it crosses water and rubble freely.
- Local avoidance (RVO or simple separation) to stop tanks clumping.

## 6.11 Debugging tools
Dev overlay: perception cones, current behavior + utility scores, nav paths, attack tokens, Director goals. Record & replay AI decisions per match for tuning.
