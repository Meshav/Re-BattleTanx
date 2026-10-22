# 12 — Code Architecture & Conventions

Doc 11 says *what* to build and in which order. This doc says *how the code is shaped* so it stays small, readable and free of monolith files as the feature list grows. These rules are enforced by tooling where possible, not by memory.

> **As built (Oct 2026, S29):** 254 TypeScript files (39 test files), largest source file under 250 lines. Module maps in §12.4 are the real ones; deviations from the original plan are marked *(changed)* with the reason.

## 12.1 Hard rules (tool-enforced)
| Rule | Limit | Enforced by |
|------|-------|-------------|
| File length | ≤ 250 lines | `scripts/check-rules.mjs` |
| Grab-bag file names (`utils`, `helpers`, `misc`, `common`, `types`) | forbidden | `check-rules.mjs` |
| Default exports | forbidden (named only, grep-able) | `check-rules.mjs` |
| `sim` touching `three`, `ws`, DOM or Node | forbidden | `check-rules.mjs` (regex; note it also trips on the word "window." in comments) + `sim` tsconfig without DOM lib |
| `any` | forbidden | TypeScript `strict`, `noUncheckedIndexedAccess` |
| Original-game names in player-facing text | forbidden | `scripts/check-ip.mjs` (doc README legal note) |
| Function length ≤ 50, nesting ≤ 3, params ≤ 4, no cycles | convention | ⏳ ESLint when CI arrives |

When a file hits the limit, split by **concept**, not by "part 1 / part 2". If you can't name the second file, the first one is doing two jobs.

## 12.2 One concept per file
- A file is a **noun** (`tank.ts`, `rail.ts`, `convoy.ts`) holding its type + the functions on it, or a **verb** (`applyDamage.ts`, `stepMovement.ts`) holding one system.
- No grab-bag files. A helper lives next to its only caller; once it has two callers in different folders it gets a named file (`math/clamp.ts`, `client/app/esc.ts`).
- Types live with the code that owns them; `sim/index.ts` re-exports the public ones.
- **Data, not code**: tunables live in `data/*.json` (tanks, specials, modes incl. convoy/siege/rail, ai, audio levels, display names). Code reads `modeDefs.convoy.escortRange`, never `25`.

## 12.3 Dependency direction
```
data/*.json  →  packages/sim  →  packages/client
                             →  packages/server
```
- `sim` depends on nothing but TypeScript and `data/`. It runs in Vitest with no DOM and no Node APIs.
- `client` and `server` depend on `sim`, never on each other.
- Shared wire types (`ClientMsg`, `ServerMsg`, `Snapshot`, `LobbySettings`, `Replay`) and the one message parser live in `sim/net/` and `sim/replay/`.

## 12.4 Package module maps (as built)

### `packages/sim`
```
sim/src/
  index.ts            # public API only
  world.ts            # World: plain data (tanks, projectiles, …, mode, convoy, lagComp?) + createWorld/addTank
  stepWorld.ts        # the only place systems are ordered
  events.ts           # SimEvent union (fire, hit, kill, round, convoy, rail, bossPhase, …)
  input.ts            # InputState
  math/               # vec2, angle, clamp, rng (seeded)
  entities/           # tank, projectile, missile, mine, nuke, turret, pickup, structure, queen, rail
  systems/            # stepMovement, stepFiring, stepProjectiles, applyDamage, stepPickups, stepRespawn, stepMode, …
    lagComp.ts        # (changed) rewind history + withRewind — in sim, not server: replays must re-run it
  weapons/            # one file per weapon behaviour (shell, hitscan, flame, rocket, mortar, guided, laserBlast, …)
  modes/              # one file per mode + mode.ts (ModeRules) + registry.ts
    rail.ts           # Oracle Raid rail cannon (mount/ride/dismount, gunOf, railArmor)
    convoy.ts         # Convoy: road, trucks, escort rule, rounds
    campaign.ts, horde.ts, siege.ts, lastGang.ts, koth.ts, battlelord.ts, queens.ts, …
  campaign/           # mission defs, waves, objectives, rescue, deploy, scoring, bosses
  ai/                 # brain (utility + hysteresis), perception, combat, aim, tokens, specials, guidedPilot,
    behaviors/        #   steering, objectiveGoal (per-mode goals: oracles, zone, core, rail, convoy)
    nav/grid.ts       # one file per behaviour: patrol, engage, retreat, seekPickup, investigate, objective, follow, escape
  progression/        # xp, levels, perks, challenges, stats, profile, glicko
  replay/replay.ts    # recorder + deterministic playback + validation
  net/                # protocol (wire types + limits), validate (trust boundary), snapshot
  data/               # typed loaders: tankDefs, modeDefs, maps, missions, names, mapCheck (player-made map validation)
```
Rules:
- `World` is a **plain data object**. Systems are functions over it that return `SimEvent[]`. No classes with hidden state, no module-level mutable state. Server-only state (`lagComp`) is an optional World field, so the same code runs everywhere.
- **Modes** implement `ModeRules`: `setup?`, `onTick?`, `onKill`, `canRespawn`, `checkWin`, plus flags (`usesFortresses`, `teamCount`, `allTeam`, `damageScale`, `allowCycle`). *(changed: `onObjective` became `onTick`, which returns events.)*
- Systems never render, log, play audio or touch sockets. They emit events.
- **Determinism is a rule**, not a hope: no `Math.random`/time in sim; inputs quantized; replays tested bit-identical.

### `packages/client`
```
client/src/
  main.ts             # boot: menu, online, campaign, editor, replays, sign-in return
  loop.ts             # fixed-step accumulator
  app/                # screens (plain DOM): menu, localMatch (+replay playback), onlineFlow (+auto-rejoin),
                      #   onlineMenu (quick match, sign-in, leaderboard, history), lobbyScreen (public/ranked, countdown),
                      #   results, pauseMenu, settingsScreen, replays, rejoin, esc
    campaign/         # campaign menu, briefing, deploy screen, debrief, progress
    profile/          # local profile, profile screen, xp panel
    editor/           # mapEditor, customMaps (saved arenas), mapCode (share codes; browser APIs)
  input/              # keyboard, mouse, gamepad, touch → raw state
  control/            # arcade, classic, twinStick, touchStick → InputState
  render/
    scene.ts, worldView.ts, teamColors.ts, viewports.ts
    camera/chaseCam.ts  # chase / cockpit / tactical rigs
    views/            # one per entity kind: tank (+tankModels incl. truck), structure, projectile, rail, strike, …
    fx/               # effects, shake
  hud/                # hud, objective, killFeed, roster, specials, minimap, setHtml
  audio/sfx.ts        # Web Audio: buses, positional/stereo, music crossfade, engine loop; manifest in data/audio.json
  net/                # socket, onlineMatch (prediction, interpolation, view tick), prediction, identity (token, sign-in, leaderboard, history)
  settings/           # settings, lastMatch
```
Rules:
- Render **reads** the world; it never mutates it.
- Reactions to gameplay (sound, particles, shake, kill feed) are driven by `SimEvent`s.
- Any text that came from a player or the network goes through `esc()` before `innerHTML`.

### `packages/server`
```
server/src/
  main.ts             # http (health, /auth/*, /leaderboard, /history) + ws; store selection; shutdown
  router.ts           # every socket message → parseClientMsg → handler; rate limits; identify (async, c.ready)
  client.ts           # Client (one connection) + send
  services.ts         # long-lived deps passed down explicitly (tokens, store)
  lobby/
    lobbies.ts        # registry (the only global state): create/join/leave/settings/start, rejoin, grace close
    quickMatch.ts     # quick match + public-lobby auto-start timers
    codes.ts
  match/
    match.ts          # one Match = World + seats + 30 Hz ticker + snapshots + recorder; dropSeat/rejoinSeat
    inputs.ts         # per-seat input queue (seq, view), rate limiting
    awards.ts         # XP, ratings (Glicko-2), placements, match-history record
  auth/
    guestToken.ts     # HMAC player tokens (issue, issueFor, verify)
    oauth.ts          # Discord/Google authorization-code flow
  persist/
    profileStore.ts   # ProfileStore interface + file and memory stores
    mariaStore.ts     # MariaDB store; runs sql/schema.sql on boot
```
*(changed)* There's no separate `api/` folder or `snapshots.ts`: the few HTTP routes are in `main.ts`, and snapshot sending is a short function in `match.ts`. Split them out when they grow.

Rules:
- A match never shares memory with another match. No global state besides the lobby registry.
- The server imports `sim`, nothing from `client`.
- The store is an interface (`ProfileStore`); every implementation passes the same contract tests (`persist/store.test.ts`).

## 12.5 Style
- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`.
- Named exports only.
- Abbreviations allowed: `dt`, `hp`, `pos`, `vel`, `rot`, `id`, `cfg`.
- Comments explain **why**, never **what**.
- Early return over nested `if`.
- A shortcut with a known limit gets `// shortcut: <limit>, <when to upgrade>`; `grep -rn "shortcut:"` is the tech-debt ledger.

## 12.6 Tests
- Every rule in `sim/systems`, `sim/weapons`, `sim/modes` has a Vitest file beside it. Test the rule, not the implementation; build a tiny world, step it, assert.
- **Soak test**, **campaign data tests** (markers, drivability, completion for all 24 missions) and **replay determinism tests**.
- Server: real-socket integration tests, unit tests with fake clients, fake timers for lobby timing, store contract tests (MariaDB via `TEST_DATABASE_URL`).
- Headless-browser smoke scripts for each user-facing feature (kept outside the repo; see CHANGES_LOG for what each section verified).

## 12.7 Definition of done (every change)
- [ ] `npm run check` passes (rules, IP guard, typecheck, tests)
- [ ] New gameplay rule has a test
- [ ] Numbers are in `data/*.json`
- [ ] No file grew past 250 lines; no grab-bag file
- [ ] `sim` still imports nothing from `three`, `ws`, DOM or Node
- [ ] Events, not cross-module peeking, for any new reaction
- [ ] Trust boundary: anything from a client, a shared file or a URL is validated (`validate.ts`, `isReplay`, `checkMap`, token verify)
- [ ] `CHANGES_LOG.md` entry; docs updated if a design value or rule changed

## 12.8 Smells → what to do instead
| Smell | Fix |
|-------|-----|
| `game.ts` / `engine.ts` / `manager.ts` growing | Split into `loop.ts` + `systems/*` |
| `switch (tank.kind)` scattered through systems | Put the varying behaviour in `data/tanks.json` (`class`, `gun`) or a per-kind file |
| A view mutating world state "just this once" | Emit an input/event; the sim decides |
| Boolean flag parameters | Two functions or an options object (`leaveLobby(…, canRejoin)` is the one tolerated case: it names the reason) |
| Copy-pasted mode logic | Shared helpers in `modes/mode.ts` (`scoreKill`, `limitWin`, `teamsOf`) + the `ModeRules` interface |
| New special-purpose entity type | First ask whether it's a tank with a `class` (Convoy trucks are) — every system already handles tanks |
| Feature flag "for later" | Delete it. Add it when the phase arrives |
