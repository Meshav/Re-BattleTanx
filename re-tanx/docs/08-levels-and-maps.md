# 08 — Levels & Maps

## 8.1 Design rules
- **Grid cities** (Original): streets as lanes, blocks as cover, intersections as arenas.
- **Three lanes minimum** in MP maps; every lane has a flank route.
- **Destruction changes the map**: each MP map has 3–6 "hidden path" walls that open shortcuts when destroyed.
- **Sightlines**: longest uninterrupted line ≤ 120 m so artillery/snipers don't dominate.
- **Pickups**: common items near lanes; rare (nuke, edge) at contested, exposed centers.
- **Readability**: landmark per map quadrant for callouts ("by the casino", "at the fountain").
- **Scale**: MP 2–4 players ≈ 200×200 m; 5–8 players ≈ 300×300 m.

## 8.2 Multiplayer map list (launch target: 8, matching the original's arena count)
| Map | Theme | Size | Highlights |
|-----|-------|------|-----------|
| Queens Grid | Ruined NYC borough | M | Tight blocks, elevated rail that collapses |
| Loop Yards | Chicago rail yard | M | Train cars as moveable cover, turntable center |
| Neon Strip | Las Vegas | L | Casino interiors you can blast through |
| Bay Span | SF bridge + piers | L | Bridge chokepoint, piers with water (Hover advantage) |
| Plains Depot | Farmland + grain silos | L | Open, artillery-friendly, silos collapse |
| Fortress Twin | Symmetric castle bases | M | Built for Battlelord; rail Goliath |
| Thames Docks | London | M | Fog, cranes, containers |
| Boulevard | Paris | M | Radial avenues around a central monument |

Each map supports all modes via mode-specific markers (fortresses, convoy path, zones).

## 8.3 Campaign maps
Built from the same modular kit; larger and linear-ish with branches. Campaign-only set pieces: scripted collapses, bridge destruction, boss arenas.

## 8.4 Modular art kit
Low-poly, flat-shaded or simple PBR, chunky silhouettes (N64 nostalgia, cheap on web).
- Road tiles, sidewalk, intersections (10 m grid)
- Building modules: 1–5 floors, 3 damage stages each
- Props: cars, barrels, kiosks, fences, lamps
- Regional dressing packs: NYC, Midwest, Desert, Coastal, UK, France, Germany

## 8.5 Map data format
Maps authored in a level editor (Blender + custom export, or Tiled for 2D layout + 3D kit placement). Exported to JSON:

```json
{
  "id": "queens-grid",
  "bounds": [200, 200],
  "tiles": "queens-grid.tiles.bin",
  "props": [{ "kit": "car_sedan", "pos": [12, 0, 40], "rot": 90, "destructible": true }],
  "structures": [{ "id": "b17", "kit": "bldg_3f_brick", "pos": [...], "hp": 400, "hiddenPath": false }],
  "spawns": { "ffa": [...], "teams": { "blue": [...], "red": [...] } },
  "pickups": [{ "type": "health", "pos": [...] }],
  "modes": {
    "battlelord": { "fortresses": { "blue": [...], "red": [...] }, "railGoliath": {...} },
    "convoy": { "path": [[...], [...]] },
    "koth": { "zones": [[...], [...]] }
  },
  "navmesh": "queens-grid.nav.bin"
}
```

## 8.6 Map editor (post-1.0)
In-browser editor with the modular kit; share maps by code; community map rotation in custom lobbies.
