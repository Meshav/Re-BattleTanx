# Change Log

## 2026-10-21 — Asset inventory and acceptance requirements

- Added a prioritized asset inventory covering the first training kit, optional menu/audio polish, combat/destruction, and later content.
- Documented GLB scale/orientation/pivots, proposed per-asset budgets, export formats, and the existing whole-scene performance goals.
- Added a rights/provenance checklist, license decision guide, browser-versus-source redistribution checks, and generated-asset records with official source references.
- Added a reusable asset record template for rights evidence, technical validation, credits, and acceptance decisions.
- Linked asset preparation and remaining loader/readiness/credits work from the README, index, implementation plan, and checklist.
- Documentation only: no asset was downloaded, generated, licensed, approved, or integrated by this change.

## 2026-10-21 — Launch briefing, countdown, and implementation checklist

- Deploy now opens an operation/vehicle/control briefing with an explicit Launch game action.
- Added a 3 → 2 → 1 → GO countdown; the world, session clock, and driving start only after GO.
- Added cancellation from the briefing/countdown with Escape or Cancel launch; focus loss during countdown also cancels.
- Clear timers on cancellation, including during GO, so abandoned launches cannot start later.
- Added modal focus handling, accessible countdown status, and responsive launch styling.
- Put launch timings in `data/launch.json` and added countdown regression tests.
- Created the [Implementation Checklist](14-implementation-checklist.md), separating completed work from proposed small follow-ups and their acceptance criteria.
- Updated the README, feature guide, documentation index, and phased implementation plan.

## 2026-10-21 — Starting dashboard and player HUD

- Added a starting dashboard with training deployment, M1 briefing, and keyboard controls.
- Added an accessible Start/Escape pause menu with Resume and Quit to dashboard.
- Pause now stops simulation and session time; loss of window/tab focus automatically pauses.
- Added live hull health, speed, heading, coordinates, session time, and a north-up player/spawn minimap.
- Shared training-ground dimensions between rendering and the map, including out-of-ground tracking.
- Reset held input across screens and cancel the session loop on quit; redeployment starts a fresh world.
- Added responsive DOM/SVG styling without dependencies.
- Added loop lifecycle and minimap projection regression tests.
- See [Dashboard and HUD](13-dashboard-and-hud.md) for behavior, implementation, verification, and limits.
