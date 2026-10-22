# 14 — Implementation Checklist & Small Next Steps

Updated: 2026-10-21. This is the status checklist for the playable starting experience.
Checked items exist in the current code; unchecked items are proposals, not shipped features.
See [Dashboard and HUD](13-dashboard-and-hud.md) for behavior and file ownership, and
[Implementation Plan](11-implementation-plan.md) for the larger roadmap.

## Implemented — dashboard and launch

- [x] Open on a starting dashboard with the available training operation, M1 briefing, and keyboard controls.
- [x] **Deploy to training** opens a launch briefing with operation, vehicle, session type, and movement instructions.
- [x] **Launch game** starts a visible **3 → 2 → 1 → GO** sequence.
- [x] Hold each number for one second and show GO for 500 ms; timing lives in `data/launch.json`.
- [x] Create the playable world only after GO finishes; no driving or session time during briefing/countdown.
- [x] **Cancel launch** or Escape returns to the dashboard from the briefing, countdown, or GO cue.
- [x] Losing window focus or hiding the tab during the countdown cancels launch, including the GO cue.
- [x] Clear pending countdown timers on cancellation so an abandoned launch cannot start later.
- [x] Reopening launch restores the briefing and starts a new countdown only after explicit confirmation.
- [x] Use modal focus containment, visible focus styles, text status for countdown beats, and a focusable cancel button.
- [x] Adapt launch and dashboard layouts to desktop, narrow portrait, and short landscape windows.

## Implemented — session and HUD

- [x] WASD movement for the M1, with live speed and heading.
- [x] Start/Escape pause menu with Resume and Quit to dashboard.
- [x] Freeze movement and session time while paused; resume the same session without time catch-up.
- [x] Pause an active session when the window loses focus or the tab is hidden.
- [x] Clear held keys across screen transitions and cancel the animation loop on quit.
- [x] Start each deployment with full health, zero speed, eastward heading, origin position, and a zeroed clock.
- [x] HUD for hull health, speed, heading, coordinates, operation, and session time.
- [x] North-up minimap with player heading, spawn, shared ground bounds, adaptive scale, and outside-ground status.
- [x] Retain the existing renderer across sessions; use plain DOM/CSS/SVG without new dependencies.

## Verification

Run `npm run ci` from `re-tanx/`.

- [x] ESLint and Prettier pass.
- [x] TypeScript checks pass for client, simulation, and server.
- [x] Ten tests pass across movement, loop pause/cancellation, minimap projection, and countdown timing/cancellation.
- [x] Production client build passes.
- [x] Chromium launch acceptance passes: briefing/focus, 3/2/1/GO, blocked pre-launch input, movement/pause/quit, cancellation by button/Escape/blur/hidden tab/GO, no delayed launch, and fresh redeployment.
- [x] Desktop (1440×1000), narrow portrait (320×568), and short landscape (844×390) launch screenshots inspected; scrolling keeps controls reachable. No browser page errors.

Repeatable browser acceptance steps:

1. Open the dashboard, choose Deploy, and inspect the briefing. Escape returns focus to Deploy.
2. Reopen and choose Launch game. Observe 3, 2, 1, GO; the HUD remains hidden until GO finishes.
3. Press and release WASD during countdown. On entry, the tank is at the origin, speed is zero, and session time starts at 00:00.
4. Drive, open Start/Escape, verify that movement and the clock freeze, then resume or quit.
5. Cancel separate launches with Escape, Cancel launch, a window blur, and a tab switch. Wait longer than the full countdown; no game should start.
6. Cancel during GO too. Reopen and confirm that a fresh countdown still launches normally.
7. Repeat at 320×568 and 844×390. The dialog stays within the viewport; content scrolls when necessary and both buttons remain reachable.

## Asset preparation and integration

See the [Asset Inventory & Compliance Guide](15-asset-inventory-and-compliance.md) for quantities,
formats, budgets, rights checks, and the acceptance checklist.

- [x] Document a prioritized training/combat/campaign asset inventory and reusable intake record.
- [ ] Acquire or create the P0 training kit and complete rights/technical review for each asset.
- [ ] Integrate one approved medium-tank GLB with loading/error handling and the procedural fallback.
- [ ] Gate the launch countdown on real asset readiness once asynchronous loading is introduced.
- [ ] Add approved ground/marker assets and verify scale, camera framing, and scene performance.
- [ ] Add distributed asset credits before shipping third-party content.

## Small next implementations — proposed, in priority order

Each item is an independent follow-up. Implement and verify one before expanding it.

- [ ] **Restart training from pause.** Add a clearly labelled restart action that uses the existing launch briefing and resets only after confirmation. Done when cancel preserves the paused session and confirm creates exactly one fresh session after countdown.
- [ ] **Training-ground edge guidance.** Expand the existing outside-ground message with a direction back to spawn. Done when the guidance reflects the player’s actual position and disappears on return; no collision system needed.
- [ ] **One driving objective.** Ask the player to move a short distance and turn, then mark practice complete without ending free drive. Done when progress comes from simulation state and pauses with the session.
- [ ] **Compact HUD option.** Add a pause-menu toggle that reduces HUD size while keeping health, heading, and map readable. Done when keyboard navigation works and both layouts fit the supported viewports.
- [ ] **Optional countdown sound.** Add an original/generated short tone with an explicit mute setting. Done when audio unlocks from the Launch click, respects mute, and stops on cancellation; visual cues remain sufficient.
- [ ] **Gamepad basics.** Add a single standard-mapped controller for driving and Start-button pause. Done when device disconnect pauses, buttons trigger once per press, and keyboard input still works.

## Deliberately outside this starting slice

Combat, damage, enemies, pickups, terrain/buildings, collision boundaries, campaign missions,
multiplayer, saves, and touch driving remain roadmap work. The current mode is solo free drive;
health remains full because there is no damage system. Quitting discards the session and leaves
the browser tab open. The launch flow does not simulate asset loading or offer unavailable modes.

## Documentation upkeep

- [x] README explains deployment, countdown, cancellation, and controls.
- [x] Feature guide documents state transitions, timer ownership, focus behavior, and current limits.
- [x] Implementation plan separates the completed launch/basic HUD from future combat work.
- [x] Documentation index links this checklist and the feature guide.
- [x] Change log records the dashboard/HUD and launch-countdown work separately.
- [ ] On the next feature change, update this checklist, the relevant behavior guide, and the change log together.
