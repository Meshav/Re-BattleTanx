# 01 — Original Game Reference

Baseline of what existed in the two N64 games. Items marked *(verify)* should be confirmed against gameplay footage before treating as canon. BattleTanx (1998) facts marked *(decomp)* were checked against the decompiled code: details and numbers in [doc 15](15-decomp-findings.md).

## BattleTanx (1998)
**Setting.** 2001, post-apocalyptic US. A war and a virus left roughly one woman per thousand men; surviving women with special power ("the Edge") are **QueenLords**, protected by tank gangs. Player is **Griffin Spade**, a "Battlelord", fighting west from New York to San Francisco to rescue his fiancée **Madison**.

**Campaign.** 17 levels across real US locations *(decomp)*: New York ×5, Chicago ×3, Midwest Highway, Las Vegas ×2, Area 51, Desert, San Francisco ×4, of which 4 are city bonus levels. Short — the game was built multiplayer-first. Lives = reserve tanks; destroyed allied tanks can regenerate *(verify specifics)*. Every level opens with its title and a 3-2-1 countdown *(decomp)*.

**Tanks (3).**
| Tank | Role |
|------|------|
| Moto Tank | Light, fast, small; twin machine guns |
| M1A1 Abrams | Balanced medium tank; standard cannon |
| Goliath | Heavy armor, strong cannon, slow |

**Gangs.** 9 selectable + 1 cheat-locked: Skull Riderz, After Shocks, Nuclear Knights, Urban Decay, Griffin's Army, Charlie Co., Dark Angels, Mech Maniacs, Psycho Brigade. Each gang = a fixed **set of five tanks** (its "lives"/rotation order) + a **signature special item** each tank spawns with (e.g. Nuclear Knights → Nuke, usable once outside Annihilation). Gangs were rated on speed, firepower, armor, intelligence.

**Multiplayer modes (up to 4 players, any slot can be AI, all modes support teams).**
| Mode | Rules |
|------|-------|
| Deathmatch | First team to 7 kills; tanks cycle through gang roster in random order |
| Annihilation | Each player has their gang's 5 tanks as lives; last team with tanks wins |
| Battlelord | CTF variant: steal **all** enemy QueenLords and bring them to your fortress; you can recover your own. Each base has an extra Goliath on a rail, manually controllable |
| Family Mode | Simplified deathmatch for quick/new players; ammo can't be switched, only used up |

**Control schemes.** Easy, Driver, Gunner, Arcade — differing in whether the turret moves independently of the hull. Camera: third-person behind tank or first-person hatch view.

**Weapons / items.** Main cannon (per tank), guided (remote-controlled) missiles that can be steered around corners, mines, cloak, auto sentry turrets, energy shields, nukes, swarm missiles, lasers. Full 1998 pickup list *(decomp)*: Health, Ammo, Star, Nuke, Swarmers, Laser, Guided Missiles, Mines, Shields, Cloaking, Grenades, Smokescreen, Gun Buddies, Radar, Extra Tank, Bonus Points (Flamer is named but has no pickup effect). Some specials have a hidden **"super shot"**: fire with a large stockpile to dump all of it in one stronger blast.

**Power-ups (series-wide).** Star (dropped by destroyed tanks; small health+ammo), Health, Ammo, Shield, Radar (always on in MP), Speed boost, Nuke, Bonus Points (campaign), 1UP (campaign).

**Environment.** Grid-like city layouts, heavily destructible: buildings, cars, roadside objects — destruction reveals secret paths and power-ups.

## BattleTanx: Global Assault (1999)
**Setting.** 2006. QueenLord **Cassandra** targets Griffin and Madison's son **Brandon**, who has telekinetic Edge powers; she mind-controls Griffin's army. Chase across the US then Europe (London, Paris, Berlin, Washington DC). Reveal: Cassandra released the 2001 virus.

**Campaign changes.** 18 missions + 1 secret. **Tank Bucks** replace lives: start with 30, earn 10 per 10,000 points or from pickups; buy a tank before each mission/respawn; can't afford one = game over. **2-player co-op campaign** with shared Tank Bucks.

**Tanks.** Roster grew to ~11–13 (N64 vs PS1): M1A1, Goliath, Moto, Hover Tank (glides over terrain), FLP-E, Inferno, Rattler, Rhino, and others *(verify full list)*. Some multiplayer-only.

**Modes.** Dropped Annihilation; kept Deathmatch, Battlelord, Family Mode; added:
| Mode | Rules |
|------|-------|
| Tank Wars | 3-minute timed match, whole squad available, most kills wins |
| Frenzy | QueenLords spawn randomly; race to grab and return them; first to 10 |
| Convoy | Two teams: Protectors escort convoy to destination; Attackers stop it |
| Hold 'Em | Hold a QueenLord as long as possible *(verify)* |

**Other.** "Edge Power" special attack, ~20 power-ups incl. teleport, plasma bolts, gun buddies (Griffin's Army signature). Bots available in every MP mode.

## What to carry forward
- The **gang-as-squad** structure (5-tank roster + signature item) — the series' most distinctive system.
- **QueenLord objective modes** (Battlelord, Frenzy) — unique flavor vs generic CTF.
- **Tank Bucks economy** from GA — better than lives for campaign pacing.
- **Destruction-reveals-secrets** level design.
- Selectable **control schemes** (hull-locked vs independent turret).

## Known weaknesses to fix
- Very short campaign with little variety.
- Flat, predictable AI (reviews and Gameshark notes suggest allied AI "didn't do much").
- Split-screen only; no persistence or progression.
