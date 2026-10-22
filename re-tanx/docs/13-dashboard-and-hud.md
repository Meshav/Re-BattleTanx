# 13 — Starting Dashboard, Start Menu & Player HUD

Implemented and expanded 2026-10-21 for the local driving prototype.
Track delivered work and small next steps in the [implementation checklist](14-implementation-checklist.md).

## Player flow

1. Open the client to the **Starting Dashboard**. It presents the available training operation, M1 vehicle briefing, and keyboard controls. No session runs here.
2. Choose **Deploy to training** to open a launch briefing with the operation, M1 vehicle, session type, and movement controls. No playable world exists yet.
3. Choose **Launch game**. The modal shows **3 → 2 → 1 → GO**. Each number lasts one second; GO lasts 500 ms. The HUD stays hidden and driving remains disabled throughout.
4. After GO finishes, the modal closes and a fresh M1 session begins at the origin with full hull health, zero speed, eastward heading, and a zeroed clock.
5. Click **Start** in the upper right or press **Escape** to open the Start menu. Simulation ticks, movement, and the session clock freeze.
6. Choose **Resume game** or press **Escape** to continue the same session immediately, without another countdown.
7. Choose **Quit to dashboard** to end the session. Redeploying goes through the briefing/countdown again and resets the session. The browser tab stays open.

**Cancel before launch:** Cancel launch or Escape closes the briefing or countdown, including GO, and returns focus to Deploy. Leaving the window or hiding the tab during the countdown cancels it as well. All pending launch timers are cleared. Returning never auto-launches; choose Deploy and Launch game again. An unconfirmed briefing stays open on focus loss because no countdown is running.

**Pause during play:** Losing window focus or hiding the tab pauses an active session. Returning requires an explicit resume. Held movement keys are cleared when changing screens to prevent stuck throttle or steering.

### Launch states

| Current state | Action | Result |
| --- | --- | --- |
| Dashboard | Deploy to training | Launch briefing |
| Briefing | Launch game | Countdown (3, 2, 1, GO) |
| Briefing / Countdown | Cancel launch or Escape | Dashboard, timer cleared |
| Countdown / GO | Window blur or hidden tab | Dashboard, timer cleared |
| GO finishes | Automatic | Fresh playable session |
| Playing | Start / Escape / focus loss | Paused session |
| Paused | Resume / Escape | Same session, no countdown |
| Paused | Quit to dashboard | Session discarded |

## Controls and accessibility

| Input | Action |
| --- | --- |
| W / S | Drive forward / reverse |
| A / D | Turn the hull left / right |
| Escape | Cancel briefing/countdown; open Start menu during play; resume while paused |
| On-screen Start | Open Start menu |
| Tab / Shift+Tab | Navigate menu buttons |
| Enter / Space | Activate focused button |

Both launch and pause menus use native modal `dialog` elements. Launch initially focuses Launch game, moves focus to Cancel launch during countdown, and returns focus to Deploy on cancellation or Start after launch. Countdown text is a polite live status; it uses no flashing or required animation. The pause menu has a labelled heading, description, focus containment, and initial focus on Resume. Focus returns to Start after resuming and Deploy after quitting. The dashboard and HUD use native buttons, visible focus outlines, and labelled regions. Health is a labelled progress element; telemetry and map information are also available as text. Rapid telemetry updates are deliberately not live announcements.

Layouts adapt to narrow portrait and short landscape windows. This is still a keyboard-controlled game; touch driving and gamepad bindings are not implemented.

## HUD and tactical map

- **Operation and clock:** local free drive and elapsed simulation time (paused time excluded).
- **Hull integrity:** current tank HP against the maximum in `data/tanks.json`.
- **Speed:** absolute signed simulation speed converted from m/s to km/h; reversing displays a positive speed magnitude.
- **Heading:** compass bearing, clockwise from north. The initial +x heading reads 090° (east).
- **Coordinates:** east = simulation x; north = simulation y, in metres.
- **Map:** north-up SVG with an orange player arrow, a spawn cross, and the actual training-ground outline. Arrow rotation follows hull heading.

`data/training-ground.json` defines the ground size and rendered grid spacing. Both the renderer and minimap use the same ground dimensions. The chart starts at 200 m across, with an inset border. It expands in 100 m increments as the tank approaches or passes the chart edge, retaining the player and origin on the chart. The scale label updates and the outlined ground shrinks proportionally. The map grid is a visual chart guide, not a fixed-distance grid after zooming out.

There are no boundary collisions in the existing simulation. Driving beyond the rendered plane shows **Outside training ground**; the minimap continues tracking the real position. No enemies, pickups, roads, or objectives are invented for the map. Combat and damage are not implemented, so health stays full during normal driving.

## Implementation

| File | Responsibility |
| --- | --- |
| `packages/client/index.html` | Semantic dashboard, HUD, and modal markup |
| `packages/client/src/app/screens.ts` | Screen changes, launch integration, focus, pause, and input gating |
| `packages/client/src/app/launch.ts` | Launch briefing/countdown modal, cancellation, and focus |
| `packages/client/src/app/countdown.ts` | Cancellable countdown timer and completion callback |
| `packages/client/src/main.ts` | Create a fresh world on deploy; cancel the session loop on quit |
| `packages/client/src/loop.ts` | Fixed-step simulation with pause gating and cancellation |
| `packages/client/src/input/keyboard.ts` | Enable/disable and clear held movement keys |
| `packages/client/src/hud/playerHud.ts` | Read-only tank and session telemetry |
| `packages/client/src/hud/minimap.ts` | Coordinate projection and SVG map updates |
| `packages/client/src/style.css` | Shared styling and modal |
| `packages/client/src/app/dashboard.css` | Dashboard layout and vehicle briefing |
| `packages/client/src/hud/hud.css` | HUD layout and responsive rules |
| `data/training-ground.json` | Shared ground dimensions |
| `data/launch.json` | Countdown length and GO cue duration |
| `packages/client/src/app/launch.css` | Launch briefing and countdown layout |

No new dependencies, framework, backend, or persistence. One renderer is reused across sessions. Quitting cancels the pending animation frame; completing the launch countdown creates one new world and loop. `launch.ts` owns and clears the countdown cancellation handle. No simulation loop is started for the briefing/countdown. `data/launch.json` sets `countdownSeconds: 3` and `goDurationMs: 500`; these are presentation timing values, separate from the simulation tick rate. Pausing clears the loop accumulator and refreshes interpolation poses, so paused time never advances the world on resume. Rendering may continue while the menu is open.

## Verification

Run `npm run ci` from `re-tanx/` for lint, TypeScript checks, Vitest, and the production build.

Verified on 2026-10-21: lint, all three packages' type checks, ten tests across four test files, and the production build passed. Automated Chromium checks passed for deployment, live telemetry and map movement, pause freeze, modal focus containment, Escape/resume, cleared input, quit/redeploy, and window-blur pause with no page errors. HUD layouts were checked at 1440×1000, 390×844, 844×390, and 320×568; screenshots were visually inspected on desktop and narrow portrait layouts.

The launch follow-up also passed Chromium checks for briefing focus, every countdown beat, disabled pre-launch gameplay, cancellation by button/Escape/window blur/hidden tab (including GO), no delayed launch, and fresh redeployment. Launch dialog screenshots were inspected at 1440×1000, 320×568, and 844×390. Short/narrow viewports use normal dialog scrolling to keep content reachable.

Automated regression tests cover:

- Countdown beats, exactly-once completion, cancellation during the numeric countdown or GO, and a fresh countdown after cancellation.
- Movement rules (the existing four simulation tests).
- Frozen world/input reads while paused, resume without elapsed-time catch-up, and loop cancellation on quit.
- North-up coordinate projection, arrow rotation, and map expansion beyond the ground.

Browser acceptance checklist:

- Dashboard is the initial screen; Deploy is keyboard accessible.
- Open the briefing, confirm Launch game, and observe 3/2/1/GO before gameplay starts.
- Cancel with Escape or the button during briefing, numeric countdown, and GO; confirm no late launch.
- Blur/hide during countdown; confirm cancellation and successful fresh redeployment.
- After launch, drive and turn; speed, position, bearing, and map marker update.
- Pause while driving; position and session clock remain unchanged.
- Tab stays within the modal; Escape resumes; held input does not stick.
- Quit and deploy repeatedly; every session begins at the origin with a zeroed clock.
- Blur the game window; it opens the pause menu.
- Inspect desktop, narrow portrait, and short landscape layouts for clipped controls or overlapping HUD panels.

## Remaining planned features

This delivers the starting shell and basic player HUD ahead of the full Phase 2 combat HUD. Roster, specials, SUPER status, kill feed, gamepad/touch controls, map terrain, and multiplayer remain in their existing roadmap phases. Quit discards the current session; no save/resume across page reloads is provided.
