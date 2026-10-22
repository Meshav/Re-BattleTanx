# 08 — Levels & Maps

> **Status (Oct 2026, S29):** maps are ASCII grids in JSON (§8.5 as built). There are 5 versus arenas, 24 campaign maps, and player-made arenas from the in-browser editor (§8.6). The modular art kit (§8.4) isn't started; everything is procedural low-poly. **How to make a map: doc 14.**

## 8.1 Design rules
- **Grid cities** (Original): streets as lanes, blocks as cover, intersections as arenas.
- **Three lanes minimum** in MP maps; every lane has a flank route.
- **Destruction changes the map**: each MP map has 3–6 "hidden path" walls that open shortcuts when destroyed.
- **Sightlines**: longest uninterrupted line ≤ 120 m so artillery/snipers don't dominate.
- **Pickups**: common items near lanes; rare (nuke, rift) at contested, exposed centres.
- **Readability**: a landmark per map quadrant for callouts ("by the casino", "at the fountain").
- **Scale**: MP 2–4 players ≈ 200×200 m; 5–8 players ≈ 300×300 m.
- **Every place a player must reach is drivable** ✅ (tested): a flood fill from the first spawn must reach every spawn, objective marker and target. Walls count as breachable; buildings and water don't. Enforced for all campaign missions and for player-made arenas.

## 8.2 Multiplayer map list (launch target: 8)
| Map | Theme | Size | Status | Highlights |
|-----|-------|------|--------|-----------|
| Graybox Grid | Test grid | M | ✅ | 4 fortresses, 2-cell streets |
| Fortress Twin | Symmetric bases | M | ✅ | Built for Oracle Raid; **rail cannon** tracks auto-placed beside each fortress |
| Neon Strip | Las Vegas | L | ✅ | |
| Bay Span | SF bridge + piers | L | ✅ | Water (Hover advantage) |
| Plains Depot | Farmland + silos | L | ✅ | Open, artillery-friendly |
| Queens Grid | Ruined NYC borough | M | ⏳ | Elevated rail that collapses |
| Loop Yards | Chicago rail yard | M | ⏳ | Train cars as moveable cover |
| Thames Docks / Boulevard | London / Paris | M | ⏳ | (exist as campaign maps) |

Every arena supports every mode. Mode-specific layout is derived from the map instead of authored per mode:
- **Fortresses** come from the `a`–`d` markers.
- **Rail cannon tracks** are laid on the open row beside each fortress.
- **Convoy roads** are planned by A* between the two fortresses at the start of each round.
- **King of the Rubble zones** are random open points.
- **Siege cores** sit on the defenders' fortress cell.

## 8.3 Campaign maps
24 maps (Act I + Act II) in `data/campaign/act1.json` and `act2.json`; Act II is authored in `scripts/build-act2.py` so the ASCII stays readable. Campaign-only markers: enemy spawns `e`, reach `X`, captives `Q`, extraction `E`, exits `O`, gun emplacements `u`, pre-laid mines `m`, targets `T`, cache buildings `C`. Mission-level `fog` (0..1) thickens the scene fog.

## 8.4 Modular art kit ⏳
Low-poly, flat-shaded or simple PBR, chunky silhouettes (N64 nostalgia, cheap on the web). Full asset specs, including the three destruction-stage models per structure, are in doc 14 §6.
- Road tiles, sidewalk, intersections (10 m grid)
- Building modules: 1–5 floors, 3 damage stages each
- Props: cars, barrels, kiosks, fences, lamps
- Regional dressing packs: NYC, Midwest, Desert, Coastal, UK, France, Germany

## 8.5 Map data format (as built)
One JSON per map, one character per 10 m cell:
```json
{ "id": "fortress", "name": "Fortress Twin", "cell": 10,
  "rows": ["############################", "#S...H....w......w....G...S#", "…"] }
```
- **Terrain:** `.` ground · `#` building (300 HP, 3 stages) · `w` wall (breakable) · `~` water · `C` building hiding a cache · `T` target.
- **Markers:** `S` spawn · `a b c d` fortress per team.
- **Pickups:** `H D A G R M N L P U K V F J Y Z * $`.

Full legend and rules: doc 14. The original plan's richer format (tiles + kit props + navmesh) is deferred until the art kit exists.

## 8.6 Map editor ✅ *(S23)*
- **In-browser** (menu → Map editor): paint on a 12–40 × 8–24 grid by click or drag (pointer events, so touch works). The palette has ground, buildings, walls, water, spawns, fortresses and every pickup; campaign markers aren't allowed. Resize keeps your painting.
- **Live validation** (`sim/data/mapCheck.ts`, shared with the server): size, rectangular rows, tile whitelist, ≥ 2 spawns, one of each fortress, every spawn reachable. Test drive and Share stay disabled until it passes. All 5 built-in arenas pass the same checks.
- **Ids are content hashes** (`c-…`), so the same layout is the same map everywhere.
- **Save / test / share:** arenas are saved in the browser and appear in the Arena list for local matches and online lobbies. Test drive plays your usual setup. Share copies a `?map=CODE` link (base64url, unicode-safe) that opens the arena in the recipient's editor.
- **Online:** the host picks a custom arena. It travels in lobby settings, is re-validated by the server, is sent to every player at match start, and is embedded in the replay.
- ⏳ Community map rotation, server-side map library, ratings.
