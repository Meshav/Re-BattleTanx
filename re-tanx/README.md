# Re-Tanx

Browser fan port of BattleTanx. Design and plan live in `docs/` (start at `docs/README.md`;
build order is `docs/11`, code shape is `docs/12`).

## Run

```
npm ci
npm run dev        # client at http://localhost:5173 — WASD drives the tank
npm run ci         # lint + typecheck + test + build (what CI runs)
npm run build && docker compose up -d   # static client via Caddy on :8088
```

## Layout

```
data/              tunable numbers (tanks.json …) — code never hardcodes these
packages/sim       pure TS game rules; runs in browser, server and Vitest
packages/client    Three.js render, input, HUD
packages/server    ws server (stub until Phase 4)
docs/              design docs
```
