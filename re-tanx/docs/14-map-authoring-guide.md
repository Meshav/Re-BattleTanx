# 14 — Map Authoring Guide

How to build a versus arena for Re-Tanx: the format, what each tile does, how destruction works and looks, what makes a good map, and what the eventual art assets must be. The format and rules are the ones the code uses today (S29). Art assets (§6) are the plan for the art pass.

Related: doc 08 (map design rules), doc 12 (where the code lives).

---

## 1. Two ways to make a map

| Way | Best for | How |
|-----|----------|-----|
| **In-game editor** | Most maps | Menu → **Map editor**. Paint, Test drive, Save, Share. Saved arenas appear in the Arena list for local and online play. |
| **JSON by hand** | Big edits, version control, built-in arenas | Write the file below. To make it a built-in arena, add it to `data/maps/` and `packages/sim/src/data/maps.ts`. To use it as a custom arena, paste its rows into the editor (or share it as a code). |

Start from the template in §8. It already passes every check.

---

## 2. The format

A map is a list of text rows. **One character = one 10 m × 10 m cell.**

```json
{
  "id": "starter-yard",
  "name": "Starter Yard",
  "cell": 10,
  "rows": [
    "########################",
    "#S........#H#.........S#",
    "…"
  ]
}
```

| Rule | Limit |
|------|-------|
| Width | 12–40 cells (120–400 m) |
| Height | 8–24 rows (80–240 m) |
| Rows | all exactly the same width |
| Edges | outside the grid is solid; a `#` border is conventional but not required |
| Name | up to 24 letters, digits, spaces, `'`, `_`, `-` |
| Id | custom arenas get a content-hash id (`c-…`) automatically: same layout = same map everywhere |

---

## 3. Tile legend

### Terrain
| Char | Tile | HP | Blocks tanks | Blocks shots | Notes |
|------|------|----|--------------|--------------|-------|
| `.` | Ground / street | — | no | no | |
| `#` | Building | 300 | until rubble | until rubble | Your cover and your lane walls |
| `w` | Wall | 120 | until rubble | until rubble | About 3 hits. Use for **hidden paths** (§7) |
| `~` | Water | — | yes, except the **Skimmer** (hover) | no | Shots fly over water |

### Markers
| Char | Meaning |
|------|---------|
| `S` | Spawn point. **At least 2**; 4–8 is better so respawns rotate |
| `a` `b` `c` `d` | Fortress for team 1–4 (one each at most). Used by Oracle Raid, Frenzy, Siege and Convoy, and for team spawns |

Fortresses also drive mode features automatically:
- **Rail cannon** (Oracle Raid): laid on the open row just below the fortress (or above, if below is blocked). It needs **3+ open cells** on that row.
- **Convoy road**: path-found between `a` and `b` at the start of each round, so there must be a drivable route.
- **Siege core**: built on fortress `a`'s cell.
- **Oracles** spawn around each fortress (3 m out), so keep the 3×3 around a fortress open.

### Pickups
| Char | Pickup | Char | Pickup | Char | Pickup |
|------|--------|------|--------|------|--------|
| `H` | Health | `L` | Laser | `J` | Teleport |
| `D` | Shield | `P` | Plasma | `Y` | Repair drone |
| `A` | Ammo | `U` | Sentry turret | `Z` | Rift (rare) |
| `G` | Guided missile | `K` | Shockwave | `*` | Random special |
| `R` | Swarm rockets | `V` | Cloak | `$` | Scrap |
| `M` | Mines | `F` | Speed | `N` | Nuke (rare) |

### Campaign-only (not allowed in the editor)
`C` building with a cache under it · `T` target · `e` enemy spawn · `X` reach point · `Q` captive · `E` extraction · `O` escape exit · `u` gun emplacement · `m` pre-laid mine.

---

## 4. Destruction phases

Every destructible (`#`, `w`, and in campaigns `T`, `C`, plus the Siege core) has **three stages**:

| Stage | Trigger | Gameplay | Placeholder look (today) |
|-------|---------|----------|--------------------------|
| **0 — Intact** | HP above 50% | Blocks tanks and shots | Full-height block. Building 9 m, wall 3 m, target 6 m, core 12 m |
| **1 — Damaged** | HP below 50% | Still blocks everything; tells players "one more volley" | Same footprint, **55% height**, darker colour |
| **2 — Rubble** | HP 0 | **Passable**: tanks drive at **60% speed** (the Skimmer isn't slowed), shots pass, bots route through at 1.5× cost, a `C` cache becomes collectable | **0.8 m slab**, darkest colour, slightly inset |

| Placeholder colours (intact → damaged → rubble) | |
|---|---|
| Buildings and walls | tan `#9c8f7a` → brown `#7a6e5d` → dark `#4d463c` |
| Targets | red `#c0432f` → `#8a3324` → `#4d2a22` |
| Core | blue `#3fb8d9` → `#2a7a90` → `#2b3a40` |

What causes damage: shells, rockets, lasers, flames, splash, nukes and ramming. The Demolitionist perk does +50% to structures. Stages are one-way (nothing rebuilds) and are sent to online players as they change.

Design consequence: **a map gets more open as a match goes on.** Plan for both the opening layout and the late-match rubble field.

---

## 5. Rules the editor enforces

Test drive and Share stay disabled until the map passes. The server re-checks the same rules for online play:

1. Size within limits, and all rows the same width.
2. Only editor tiles (no campaign markers).
3. At least 2 spawns.
4. At most one of each fortress `a`–`d`.
5. **Every spawn reachable from the first spawn.** Walls count as breakable; buildings and water count as solid. A spawn sealed in by buildings or water fails.

---

## 6. Final art assets (for the art pass)

Nothing in the sim depends on how things look, so assets can be swapped in by changing the render views only (`packages/client/src/render/views/structureView.ts`, `groundView.ts`). Direction: low-poly, flat-shaded or simple PBR, chunky N64-style silhouettes, `.glb` with Meshopt compression.

### Destructibles: three models each, one per stage
| Asset | Stage 0 (intact) | Stage 1 (damaged) | Stage 2 (rubble) |
|-------|------------------|-------------------|------------------|
| Building (1–5 floors; regional sets: NYC, Midwest, Desert, Coastal, UK, France, Germany) | Whole building | Façade blown out, roof and upper floors gone, ~half height | Rubble pile under 1 m that clearly reads as drivable |
| Wall | Intact segment (concrete, brick, chain-link + sandbags) | Holed and cracked, lower | Scattered blocks |
| Target (campaign: generator, transmitter, foundry) | Working machine, lights on | Smoking, sparking, broken | Burnt-out wreck |
| Cache building (campaign) | Same as building | Same as building | Rubble with a visible crate |
| Siege core | Glowing pylon | Cracked, flickering | Dead base |

Hard constraints for every structure model:
- **Footprint exactly 10 × 10 m**, origin at the cell centre on the ground. Collision is the cell, not the mesh.
- **Heights**: building 9 m (taller variants are fine visually), wall 3 m, target 6 m, core 12 m. Damaged ~55%, rubble under 1 m.
- **Readability over detail**: from the chase camera, damaged must look "about to go" and rubble must look driveable.
- **Fade-friendly**: buildings between the camera and your tank are faded, so avoid huge overhangs past the cell.
- Stage transitions should trigger a dust/debris effect off the existing `structureStage` event (today only a sound plays; the render effect is part of the art pass).

Suggested file names: `bldg_<style>_s0.glb`, `bldg_<style>_s1.glb`, `bldg_<style>_s2.glb`; `wall_<style>_s0..s2`; `target_<kind>_s0..s2`; `core_s0..s2`.

### Non-destructible tiles
| Tile | Asset |
|------|-------|
| Ground `.` | Road / sidewalk / intersection tiles on the 10 m grid (auto-picked from neighbouring cells) |
| Water `~` | Animated water plane, shoreline edge pieces |
| Fortress `a`–`d` | Team-coloured pad (9 m radius) + 4 pylons (exists as placeholder) |
| Rail cannon | Twin rails + gun car (exists as placeholder) |
| Pickups | Floating crates with an icon per kind (exist as placeholder) |

Props (cars, barrels, lamps, fences) are planned as decoration on `.` cells. They're visual only until a later version makes some of them destructible cover.

---

## 7. What makes a good arena

| Guideline | Why | How |
|-----------|-----|-----|
| **Grid city, 3+ lanes** | Readable fights, flanking always possible | Streets 1–2 cells wide between 2×2 to 3×3 building blocks |
| **3–6 hidden paths** | Destruction changes the map | Single `w` cells blocking a shortcut between lanes |
| **Sightlines ≤ 12 cells (120 m)** | The Howitzer (artillery) mustn't dominate | Break long straight streets with a building or a wall |
| **Spawns spread and out of sight of each other** | No spawn camping | Corners and lane ends, 4–8 of them |
| **Common pickups on lanes, rare ones exposed** | Risk vs reward | `H`, `A` along routes; `N`, `Z`, `*` in open centres |
| **Fortresses far apart with open ground around them** | Objective modes need room | Opposite corners or ends; keep the rail row open (§3) |
| **Water as a Skimmer shortcut** | Gives the hover tank a niche | Small pools or a channel with a bridge, never sealing off a spawn |
| **Size to player count** | Too big = boring, too small = chaos | ~20×20 cells for 2–4 players, ~30×30 for 5–8 |
| **One landmark per quadrant** | Callouts ("at the pool") | A distinctive building cluster, water or plaza per quarter |

Test every new arena with **Test drive** in Deathmatch with 3 bots, then in Oracle Raid and Convoy if it has fortresses. Watch where bots get stuck and where fights happen.

---

## 8. Starter template — "Starter Yard" (24 × 15)

Passes every check. It has: 2 fortresses with open rail rows, 4 spawns, 2 water pools, 5 breakable walls (hidden paths), centre risk pickups (`*`, `$`), health at both spawn ends, and a nuke on an exposed flank.

```
########################
#S........#H#.........S#
#..a......w.w.....##...#
#.........#.#.....##.G.#
#..##..............w...#
#..##..~~~....###......#
#......~~~....#*#..##..#
#..w.......$..###..##..#
#..w..##..............N#
#.....##....~~~........#
#.R.........~~~....##..#
#....##..w.........##..#
#....##..w......b......#
#S.........#H#........S#
########################
```

- **File:** `docs/map-templates/starter-yard.json` in the repo.
- **Open it in the editor:** menu → Map editor → paste this code into **Map code** → Load. Or open `…/?map=<code>` on your server.

```
WyJTdGFydGVyIFlhcmQiLFsiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIiwiI1MuLi4uLi4uLiNIIy4uLi4uLi4uLlMjIiwiIy4uYS4uLi4uLncudy4uLi4uIyMuLi4jIiwiIy4uLi4uLi4uLiMuIy4uLi4uIyMuRy4jIiwiIy4uIyMuLi4uLi4uLi4uLi4uLncuLi4jIiwiIy4uIyMuLn5-fi4uLi4jIyMuLi4uLi4jIiwiIy4uLi4uLn5-fi4uLi4jKiMuLiMjLi4jIiwiIy4udy4uLi4uLi4kLi4jIyMuLiMjLi4jIiwiIy4udy4uIyMuLi4uLi4uLi4uLi4uLk4jIiwiIy4uLi4uIyMuLi4ufn5-Li4uLi4uLi4jIiwiIy5SLi4uLi4uLi4ufn5-Li4uLiMjLi4jIiwiIy4uLi4jIy4udy4uLi4uLi4uLiMjLi4jIiwiIy4uLi4jIy4udy4uLi4uLmIuLi4uLi4jIiwiI1MuLi4uLi4uLi4jSCMuLi4uLi4uLlMjIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIl1d
```

---

## 9. Checklist before you share a map
- [ ] Editor shows no problems
- [ ] Test drive: Deathmatch with 3 bots plays well for 3+ minutes
- [ ] No sightline longer than ~12 cells
- [ ] At least 3 hidden paths (`w`)
- [ ] If it has fortresses: Oracle Raid and Convoy both start, the rail cannon appears, trucks find a road
- [ ] Spawns can't see each other
- [ ] It has a name players will remember
