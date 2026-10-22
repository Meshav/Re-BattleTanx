# Re-Tanx

Browser fan port of BattleTanx. Design and plan live in `docs/` (start at `docs/README.md`;
build order is `docs/11`, code shape is `docs/12`).

## Run

```
npm ci
npm run dev        # client at http://localhost:5173 — deploy from the dashboard
npm run ci         # lint + typecheck + test + build (what CI runs)
npm run build && docker compose up -d   # static client via Caddy on :38473
```

## Play

Choose **Deploy to training** on the starting dashboard, review the briefing, then choose
**Launch game**. After **3 → 2 → 1 → GO**, your fresh session begins. **Cancel launch** or
**Escape** returns to the dashboard before launch; switching away during countdown also cancels.
Use **W/S** to drive or reverse and **A/D** to turn. Click **Start** or press **Escape** to pause, resume, or quit to the
dashboard. Switching tabs also pauses. Quitting ends the session; deploying again starts
fresh. This is a keyboard-only driving prototype; combat is not implemented yet.

The HUD shows hull health, speed, heading, coordinates, elapsed session time, and a
north-up minimap with the player, spawn, and training-ground boundary.

See [Dashboard and HUD](docs/13-dashboard-and-hud.md) for the UI behavior and verification
steps, the [Implementation Checklist](docs/14-implementation-checklist.md) for completed work
and small next steps, and [Change Log](docs/CHANGES_LOG.md) for implementation notes.

## Adding assets

Start with the [Asset Inventory & Compliance Guide](docs/15-asset-inventory-and-compliance.md)
for the first training kit, later combat assets, formats, performance targets, and license checks.
Use the [asset record template](docs/asset-record-template.md) to document each candidate.
The current game uses procedural visuals; model/audio loading still needs implementation.

## Layout

```
data/              tunable numbers (tanks.json …) — code never hardcodes these
packages/sim       pure TS game rules; runs in browser, server and Vitest
packages/client    Three.js render, input, HUD
packages/server    ws server (stub until Phase 4)
docs/              design docs
```
