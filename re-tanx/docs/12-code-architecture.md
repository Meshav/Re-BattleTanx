# 12 — Code Architecture & Conventions

Doc 11 says *what* to build and in which order. This doc says *how the code is shaped* so it stays small, readable and free of monolith files as the feature list grows. These rules are enforced by tooling where possible (ESLint, TypeScript, tests), not by memory.

## 12.1 Hard rules (lint-enforced)
| Rule | Limit | Enforced by |
|------|-------|-------------|
| File length | ≤ 250 lines (error at 300) | `max-lines` |
| Function length | ≤ 50 lines | `max-lines-per-function` |
| Nesting depth | ≤ 3 | `max-depth` |
| Parameters | ≤ 4 (pass an object beyond that) | `max-params` |
| `any` | forbidden | `@typescript-eslint/no-explicit-any` |
| Default exports | forbidden (named only, grep-able) | `no-restricted-syntax` |
| `sim` importing `three`, `ws`, DOM or Node APIs | forbidden | `no-restricted-imports` + separate `tsconfig` libs |
| Circular imports | forbidden | `import/no-cycle` (add the plugin when the first cycle appears) |

When a file hits the limit, split by **concept**, not by "part 1 / part 2". If you can't name the second file, the first one is doing two jobs.

## 12.2 One concept per file
- A file is a **noun** (`tank.ts`, `projectile.ts`, `pickup.ts`) holding its type + the functions that operate on it, or a **verb** (`applyDamage.ts`, `stepMovement.ts`) holding one system.
- No `utils.ts`, `helpers.ts`, `misc.ts`, `common.ts`. A helper lives next to its only caller; once it has two callers in different folders it gets a named file (`math/clamp.ts`).
- No `types.ts` dumping ground per package. Types live with the code that owns them; `sim/index.ts` re-exports the public ones.
- **Data, not code**: every tunable number lives in `data/*.json`. Code reads `tanks.m1.speed`, never `11`.

## 12.3 Dependency direction
```
data/*.json  →  packages/sim  →  packages/client
                             →  packages/server
```
- `sim` depends on nothing but TypeScript and `data/`. It must run in Vitest with no DOM and no Node APIs.
- `client` and `server` depend on `sim`; never on each other.
- Shared wire types (`InputCmd`, `Snapshot`, lobby messages) live in `sim/net/`, so both sides import one definition.

## 12.4 Package module maps
Folders are fixed; files inside them appear as phases add features. A folder with one file is fine. A folder with 30 files is not: add a subfolder by concept.

### `packages/sim`
```
sim/
  index.ts            # public API only: createWorld, stepWorld, types
  world.ts            # World type: plain object of component arrays + tick counter
  ids.ts              # EntityId allocation / recycling
  math/               # vec2, angles, clamp, rng (seeded) — pure, no world access
  entities/           # one file per entity kind: tank, projectile, pickup, structure, queen
  systems/            # one file per rule: stepMovement, stepTurret, stepProjectiles,
                      #   applyDamage, stepPickups, stepDestruction, stepRespawn
  weapons/            # one file per weapon behaviour: cannon, machineGun, guided, swarm, mine, nuke …
  modes/              # one file per mode: deathmatch, annihilation, battlelord … each exports
                      #   { setup, onKill, onObjective, checkWin }
  ai/
    perception.ts     # vision / hearing / memory
    brain.ts          # utility scorer + hysteresis
    behaviors/        # one file per behaviour: patrol, engage, flank, retreat …
    director.ts       # squad roles & tactics
    archetypes.ts     # weight presets (data-like)
    nav/              # grid A*, cost tables, path cache invalidation
  events.ts           # SimEvent union: emitted per tick for render/audio/net to consume
  net/                # wire types + encode/decode (JSON now, binary later)
  data/               # typed loaders/validators for data/*.json
```
Rules:
- `World` is a **plain data object**. Systems are pure functions `step(world, dt): SimEvent[]`. No classes with hidden state, no singletons, no module-level mutable state. This is what makes the sim run identically in browser, server and tests.
- `stepWorld` is the only place that orders systems. Each system does one thing.
- Systems never render, log, play audio or touch sockets. They emit events; consumers subscribe.

### `packages/client`
```
client/
  main.ts             # boot: pick screen, start loop
  app/                # screen router (menu, lobby, match, results) — plain DOM
  loop.ts             # fixed-step accumulator; calls sim.stepWorld; render at display rate
  input/              # one file per device: keyboard, mouse, gamepad, touch → InputState
  control/            # one file per control scheme: arcade, classic, twinStick, easy
  render/
    scene.ts          # Three.js scene/renderer setup, viewport split
    camera/           # chase, hatch, tactical, missileCam
    views/            # one file per entity kind: TankView, ProjectileView, StructureView …
                      #   each: create(entity) / update(entity, alpha) / dispose()
    fx/               # particles, screen shake, hit-stop
    assets/           # glTF loading, LOD, instancing
  hud/                # one file per HUD element: healthBar, roster, specialCarousel, minimap, killFeed
  audio/              # Howler wrapper + event→sound mapping
  net/                # WebSocket client, prediction, reconciliation, interpolation
  settings/           # localStorage bindings/graphics/audio
```
Rules:
- Render **reads** the world; it never mutates it. Views own their Three objects and nothing else.
- Everything that is a reaction to gameplay (sound, particles, shake, kill feed) is driven by `SimEvent`s, not by views peeking at state changes.
- HUD is DOM over the canvas. No framework until menus are painful (doc 11 §11.4).

### `packages/server`
```
server/
  main.ts             # http + ws listen, routes
  lobby/              # create/join/codes/settings/bot fill
  match/
    match.ts          # one Match = one World + its sockets + 30 Hz ticker
    inputs.ts         # validate + buffer client InputCmds
    snapshots.ts      # delta vs last-acked, 20 Hz send
    lagComp.ts        # rewind for hitscan
  auth/               # guest tokens; OAuth in Phase 6
  persist/            # MariaDB access, one file per table (Phase 6)
  api/                # HTTP endpoints: profile, match history
```
Rules:
- A match never shares memory with another match. No global state besides the lobby registry.
- The server imports `sim` and nothing from `client`.

## 12.5 Style
- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`.
- Prettier defaults; ESLint runs in CI. No formatting debates.
- Named exports only. One export per file is normal; a file exporting ten things is probably a folder.
- Abbreviations allowed: `dt`, `hp`, `pos`, `vel`, `rot`, `id`, `cfg`. Nothing else.
- Comments explain **why**, never **what**. If the *what* needs a comment, rename or split.
- Early return over nested `if`. No `else` after `return`.
- A shortcut with a known limit gets a code comment: `// shortcut: <limit>, <when to upgrade>` so `grep shortcut:` is the tech-debt ledger.

## 12.6 Tests
- Every rule in `sim/systems`, `sim/weapons`, `sim/modes` has a Vitest file beside it (`applyDamage.test.ts`). Test the rule, not the implementation.
- `sim` tests run with no mocks: build a tiny world, step it, assert.
- One **headless soak test** (`sim/soak.test.ts`): bots vs bots, N matches, every match ends, no NaN positions. Runs in CI from Phase 3.
- Client/server tests are optional until Phase 4; the netcode gets a test harness with simulated latency.

## 12.7 Definition of done (every change)
- [ ] Lint + typecheck + tests pass
- [ ] New gameplay rule has a test
- [ ] Numbers are in `data/*.json`
- [ ] No file grew past 250 lines; no new `utils`/`helpers` file
- [ ] `sim` still imports nothing from `three`, `ws`, DOM or Node
- [ ] Events, not cross-module peeking, for any new reaction (sound, UI, net)
- [ ] Docs updated if a design value or rule changed

## 12.8 Smells → what to do instead
| Smell | Fix |
|-------|-----|
| `game.ts` / `engine.ts` / `manager.ts` growing | It's the loop + several systems; split into `loop.ts` + `systems/*` |
| `switch (tank.type)` scattered through systems | Put the varying behaviour in `data/tanks.json` or a per-kind file |
| A view mutating world state "just this once" | Emit an input/event; the sim decides |
| Boolean flag parameters (`step(world, dt, true)`) | Two functions or an options object |
| Copy-pasted mode logic | Modes share `modes/common.ts` (score, respawn) and override via the `{ setup, onKill, onObjective, checkWin }` interface |
| Class with `update()` doing five things | Five functions in `systems/` |
| Feature flag "for later" | Delete it. Add it when the phase arrives |
