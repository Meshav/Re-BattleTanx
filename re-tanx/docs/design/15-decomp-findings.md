# 15 — Decomp Findings (BattleTanx N64)

> **Status (23 Oct 2026, S35):** first pass. Read from the matching decompilation `oggame/BattleTanx-main` (USA Rev 0) and the static recompilation `oggame/battle-tanx-recomp-main`, both GPL-3.0 code with no game data. File paths below are under `oggame/BattleTanx-main/src/code/`; `func_8007F2A0`-style names are retail addresses. This doc settles many of doc 01's *(verify)* items with facts from the code, and lists what Re-Tanx still lacks (§15.8).

**Time units.** The original counts logic frames. This doc converts at **30 frames/s**: the M1A1 cannon's 30-frame refire then equals the 1.0 s already in `data/tanks.json`. The frame rate itself is not yet proved from the frame loop.

**World units.** Distances are N64 world units. A tank's muzzle sits 45 units forward and 36 up, and a Goliath's footprint is 1.5 × 45 units across. Treat roughly 10 units ≈ 1 m until a model is measured.

## 15.1 Assets: none in the repos, none to ship
- **Neither repo contains game audio, textures, models or levels.** Both say so in their READMEs and require a user-supplied ROM dump.
- What looks like art: `battle-tanx-recomp-main/assets/` is launcher UI (Inter and Noto Emoji fonts, PromptFont, SVG icons, an RmlUi stylesheet). `assets/Background.png` is a screenshot of the original game, so it is copyrighted game imagery. `icons/app.png` is a generic radiation symbol.
- The ROM's asset region (`config/us/asset_ledger.tsv`) holds images 1.67 MB, textures 1.40 MB, sound effects 1.14 MB, animations and demo recordings 0.75 MB, models 0.73 MB, music 0.69 MB, levels 0.52 MB, navigation meshes 0.26 MB and fonts 0.06 MB. `python3 tools/battletanx_assets.py extract` dumps raw bundle entries from your own ROM into ignored `build/` paths. Converting them to WAV/PNG/glTF is not done by that tool.
- **Re-Tanx rule unchanged:** no ripped assets in this repo or on a hosted instance (docs README, legal note). The originals are used as **specs**: what plays when, for how long, and what is on screen. Our own placeholders are then built to match (e.g. §15.2).

## 15.2 Pre-match countdown ✅ (built S35)
Original (`update_match_state.c`, `frontend/draw_frame_overlays.c`, `render/draw_title_quads.c`, `runtime/apply_mode_display_rows.c`):

| Beat (18 frames each, 5 beats) | On screen | Sound |
|---|---|---|
| 1 | Level title image slides down into place at the top | — |
| 2 | Title holds | sound 0x14 at the end of the beat |
| 3 | **3** (a colour-cycling quad drawn in 3D, twice for depth); campaign also shows the mission text under it | beep (sound 1) |
| 4 | **2** | beep |
| 5 | **1** | beep |
| end | Play starts; the level's music starts now; the endurance mode shows "KILL *n* TANKS / POINTS × *m*" with *m* = (*n* − 5) / 3 + 1 | — |

- One mode flag (`value1CC == 1`, meaning unknown) uses 24-frame beats instead of 18.
- In the campaign, a briefing screen comes first. Its text fades and any button skips ahead to the countdown.
- **Re-Tanx:** `data/rules.json` `countdown` {beatTicks 18, beats 5, digits 3} = 3 s at 30 Hz. `ModeConfig.countdown` turns it on; local matches, campaign missions and online matches use it, and replays carry it. While `mode.countdown > 0`, `stepWorld` only counts down (`systems/stepCountdown.ts`): nothing moves, fires, scores or uses up match time. Client prediction and the movement preview hold still too.
- The sim emits `{ type: "countdown", left }` once per beat. The HUD (`hud/countdown.ts`) shows the arena or mission title, then 3-2-1, then **GO!** for one beat. Audio plays the new procedural `countdown_beep` and `countdown_go` sounds.
- ⏳ The music still starts at load, not at GO.

## 15.3 Units (tanks)
`gameplay/spawn_unit.c`, `gameplay/spawn_squad_unit_at.c`, tables in `data/data_80125550.c`.

| Kind | HP | Footprint scale | Raw drive params (meaning unconfirmed) |
|---|---|---|---|
| Moto | 30 | 0.726 | 0.22 · 100 · 230 · 50 |
| M1A1 | 100 | 1.0 | 0.18 · 250 · 300 · 100 |
| Goliath | 200 | 1.5 | 0.16 · 250 · 230 · 100 |

- In campaign modes, a Goliath owned by a local player gets ×1.5 HP. It gets ×2 when flag 4 is set; the same flag triples heavy-cannon fire rate, so flag 4 is probably "on the rail".
- **Damage** (`gameplay/apply_unit_damage.c`): hit × victim owner's damage % ÷ attacker's % (per-player handicaps), minimum 1. A shield pool absorbs first. There is **no directional armour**; Re-Tanx's rear/side multipliers are an enhancement. Dropping below 50% HP raises a warning notice. Controller rumble = damage / 3 + 20, capped at 40.
- Team tuning record (`debug/write_team_tuning_report.c`): aggressiveness, intelligence, offense, defense, AI speed factor, AI fire rate, Goliath fire rate on/off rails, Goliath speed on rails, gun resurrection, and four fortress guns with their own fire rate and damage.
- Re-Tanx today: Moto 60 / M1 100 / Goliath 160 HP; cannon 1.0 s (M1) and 1.6 s (Goliath); Moto MG 0.166 s. These are tuning candidates only. Balance stays a design call (doc 03).

## 15.4 Weapons and refire (`gameplay/fire_unit_weapon.c`, delay table `D_80125EC0`)
Weapon kind → refire in frames (seconds at 30 fps). Kinds were matched to names through the pickup table in §15.5.

| Kind | Weapon | Refire | Notes |
|---|---|---|---|
| 1 | Main cannon | 30 (1.0 s) | turret-aimed shell |
| 2 | Machine gun | 3 (0.1 s) | from the hull, alternating left/right (±11.1 units) |
| 3 | Heavy cannon | 40 (1.33 s) | ÷3 with flag 4 (rail) |
| 4 | Swarmers | 50 (1.67 s) | fan with ±3 random spread |
| 5 | Laser | 54 (1.8 s) | a full stock fires at once (stock reset to 1) |
| 6 | Nuke | 50 | placed, team-owned |
| 7 | Grenades | 10 (0.33 s) | |
| 11 | Guided missiles | 50 (1.67 s) | flag 0x2000 fires the whole stock (super shot) |
| 12 | Mines | 15 (0.5 s) | |
| 13 | Gun Buddies | 60 (2 s) | spawns a helper unit of the player's tank kind |
| 14 | Smokescreen | 60 (2 s) | 90-unit radius |
| 15 | Cloaking | 120 (4 s) | lasts 900 frames (30 s); using another adds 900 |
| 16 | Stored health kit | 1 | |

Kinds 8 (5 frames) and 10 (50 frames) are not yet identified. With cheat flag `D_80134E68` set, every kind ≥ 4 refires in 20 frames.

## 15.5 Pickups (`gameplay/apply_pickup.c`, names in `data/rodata_80072E34.c`)
| # | Name | Effect |
|---|---|---|
| 0 | Health | +30% max HP; when already full, stored as a usable kit |
| 1 | Nuke | +1 |
| 2 | Swarmers | +5 |
| 3 | Laser | +5 |
| 4 | Radar | radar on (unit flag 0x80) |
| 5 | Ammo | +30 cannon or +70 MG ammo |
| 6 | Flamer | named, but no pickup effect in this function |
| 7 | Guided missiles | +5 |
| 8 | Shields | +100 shield strength (stacks on an active shield) |
| 9 | Mines | +5 |
| 10 | Gun Buddies | +2 (#19: +1) |
| 11 | Star | +20% HP and +15 cannon / +35 MG ammo |
| 12 | Cloaking | +1 |
| 13 | Extra tank | +1 tank |
| 14 | (unnamed) | calls a 900-value player routine (bonus time or points, unconfirmed) |
| 15 | Grenades | +5 |
| 16 | Smokescreen | +3 |
| 18 | Shields (small) | +25 strength |

- Main guns have ammo in the original: cannon and MG are refilled by Ammo and Star. Re-Tanx main guns are infinite.
- Every pickup plays sound 0x2B, flashes its name, and adds 100 progress points.

## 15.6 Buildings, destructibles and fortress guns
- **Breakables** (`effects/handle_breakable_object_event.c`) break on any single weapon hit: debris burst plus sound 0x13.
  - A tank driving into one wears it down by speed × 12 per frame, three times faster for one tank mode. Meanwhile the tank is slowed and jolted side to side.
  - So props can be crushed by ramming as well as shot.
- **Placed objects** (`effects/destroy_placed_object.c`) fly apart into their model's sub-parts as spinning debris; on harder difficulty some pieces linger. Objects flagged explosive (barrels) blow up and hit everything within **108 units for 20**.
- **Fortress guns** (`gameplay/update_turret.c`):
  - HP 25 / 50 / 100 by size.
  - A destroyed gun rebuilds after the team's rebuild % × 1800 frames (60 s), scaled ×1.5 / 1.0 / 0.75 / 0.5 by a per-owner count. That count is possibly QueenLords held; the intro text says more queens means better survival.
  - A gun only rebuilds when its footprint is clear.
- **Gates** (`effects/update_gate_object.c`) and **bonus crates** (`gameplay/bonus_crate_handle_message.c`) exist; not yet analysed.
- Re-Tanx today: buildings, walls, targets and the Siege core use three-stage structures. Props, explosive barrels and fortress guns are not built.

## 15.7 Levels, roads and flow
- **Levels** (`levels/get_level_name.c` and strings):
  - New York: Queens, Times Square, Tunnel, Washington Bridge, Bonus.
  - Chicago: Lake Shore Drive, State Street, Bonus.
  - Midwest: Highway.
  - Las Vegas: Fremont Street, Bonus.
  - Area 51; Desert.
  - San Francisco: Golden Gate Bridge, Quarantine Zone, The Wharf, Bonus.
  - Multiplayer arenas include MPMissile, MPWharf, The Arena, Trackattack and Bronx.
- **Roads** are not a separate system. They are part of each level's world stream (geometry and placement records, loaded by `load_level_resources`). AI moves over a navigation mesh of triangles with per-triangle kinds (`func_800DDA08` path). Re-Tanx's grid of open cells plays the same role.
- **Mission objectives seen:** destroy 5 or 15 tanks; rescue 1–3 QueenLords; rescue the partner; cross the bridge, highway or tunnel; clear an area; destroy the enemy or fortified bunker; return the queen home. Results show battle stats, tanks lost, bonus tanks won, your time against par time, a time bonus and one of 11 rank titles.
- **Front end:**
  - Options: power-ups on/off, power-up regen, friendly fire, difficulty Easy / Normal / Hard, players, music and SFX volume.
  - Control modes Easy, Driver, Gunner and Arcade, plus "dynamic control" and a turret-locked option.
  - Saves go to the Controller Pak, plus level password codes.
- **Squad orders:** ATTACK, CHARGE and RETREAT, acknowledged with "ORDERS RECEIVED".
- **HUD notices:** Under Attack, Fortress Under Attack, Queen Secure, Captured, Rescued, Off Rail, Picked Up, Damaged, Destroyed.
- **Cheats:** unlimited ammo and lives, all weapons, an extra cheat gang, hurl mode and several visual jokes.

## 15.8 Gaps in Re-Tanx (from this pass)
| Original feature | Re-Tanx | Next step |
|---|---|---|
| Pre-match countdown with level title | ✅ S35 | music starts at GO ⏳ |
| Grenades, Smokescreen, Gun Buddies specials | ⏳ missing | specs in §15.4/§15.5; `data/specials.json` + `sim/weapons/` |
| Radar pickup (campaign) | ⏳ | doc 02 already lists it |
| Extra-tank pickup | Scrap (`bucks`) pickup covers the economy | keep |
| Breakable props, ram-to-crush, explosive barrels | ⏳ debris tier waits for art kit | mechanics now specified (§15.6); can start with code-made models like everything else |
| Fortress guns that rebuild (Battlelord) | ⏳ not in Battlelord/Siege | reuse campaign turrets + a rebuild timer |
| Squad orders ATTACK / CHARGE / RETREAT | ⏳ (wingman command wheel) | three orders are enough |
| Lobby toggles: power-ups, power-up regen, friendly fire | ⏳ | lobby settings + `sanitizeSettings` |
| Easy / Driver / Gunner control modes | Arcade, Classic, Twin-stick built; Easy ⏳ | doc 02 §2.2 |
| Finite main-gun ammo | intentionally infinite | keep (doc 02 §2.5) |
| Directional armour | Re-Tanx enhancement | keep |
