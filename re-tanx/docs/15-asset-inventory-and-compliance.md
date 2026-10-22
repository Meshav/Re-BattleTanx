# 15 — Asset Inventory & Compliance Guide

Updated: 2026-10-21. Use this list when making, commissioning, generating, or downloading assets.
**Start with one original medium tank and a small training-ground kit.** The existing dashboard,
countdown, HUD, and minimap already work without external art; replacing them is optional.

“Compliant” here means suitable for this project's style, runtime, performance, and documented
usage rights. A valid file or a marketplace purchase alone does not establish all four.
These are project acceptance rules, not a legal clearance of any particular asset.

## Current state and priorities

- **Already implemented:** procedural box tank, ground/grid, SVG tank briefing, SVG minimap markers, DOM/CSS menus, system-font stack. No additional files are needed to run them.
- **Not implemented:** GLB loading, texture loading for authored terrain, audio playback/settings, damage states, combat effects, animated tracks, or asset credits in the game. Adding files alone will not activate these features.
- **P0:** first visual replacement for the existing driving session.
- **P1:** small optional improvements to training/menu presentation.
- **P2:** first combat/destruction slice, once its gameplay systems exist.
- **P3:** broader roster, multiplayer, and campaign content. Do not acquire the entire launch roster yet.

All entries below are **unacquired / unverified**. IDs are proposed stable asset names, not existing files.
Mark an asset complete only after the acceptance checklist below passes. Quantities are an initial
production plan, not a requirement to buy separate packs.

## Asset list

### P0 — first training visuals

| Done | Asset ID / deliverable | Initial quantity | Requirement and use | Integration needed |
| --- | --- | --- | --- | --- |
| [ ] | `tank-medium-01` | 1 GLB + editable master | Original chunky medium tank; separate hull, turret, barrel, and tracks; team-color area | Add GLTFLoader and replace the box view while retaining the existing chase camera |
| [ ] | `tank-medium-palette-01` | 1 shared palette/material set | Muted metal/olive body, readable turret, orange accent; vertex colors or one small texture set | Included with the tank; avoid a separate material for every small part |
| [ ] | `ground-training-01` | 1 tileable surface | Concrete/asphalt/gravel appropriate to a flat 200×200 m ground | Apply to the existing plane; preserve visible navigation cues |
| [ ] | `training-marker-kit-01` | 3 meshes | One cone, one low barrier, one spawn-pad marker; reuse instances | Placement data and instanced rendering; barriers are decorative until collision exists |

Minimum handoff: tank master + GLB, its material resources, one ground surface, three marker meshes,
preview images, and a completed asset record for each independently licensed item. A shared pack
record may cover multiple files only when their provenance and license are identical.

### P1 — small presentation and audio additions

| Done | Asset ID / deliverable | Initial quantity | Requirement and use | Integration needed |
| --- | --- | --- | --- | --- |
| [ ] | `ui-logo-01` / favicon | 1 original mark + exports | Distinct project identity; avoid original-game logos and faction emblems | Replace current text mark only after identity is chosen |
| [ ] | `ui-training-preview-01` | 1 image, optional | Screenshot/render of the actual training scene; no baked menu text | Dashboard image; current SVG briefing can remain |
| [ ] | `ui-icon-kit-01` | Up to 8 SVGs, optional | Play, pause, resume, quit, health, speed, compass, sound; consistent strokes | Existing text/SVG controls remain usable without these |
| [ ] | `sfx-ui-confirm-01`, `sfx-ui-cancel-01` | 2 short cues | Distinct, quiet menu feedback | Audio activation from a user gesture plus mute/volume controls |
| [ ] | `sfx-countdown-tick-01`, `sfx-countdown-go-01` | 2 short cues | Reuse the same tick for 3/2/1; clearly distinct GO | Follow existing countdown timing; stop cues on cancellation |
| [ ] | `sfx-engine-idle-01`, `sfx-engine-drive-01` | 2 seamless loops | Engine/track character without speech or recognizable sampled game audio | Speed-based mixing; stop/suspend correctly on pause and quit |
| [ ] | `music-menu-01` | 1 optional 30–90 s loop | Original restrained atmosphere; no imitation of the original soundtrack | Lazy loading, mute, loop/crossfade handling; not needed for first training polish |
| [ ] | `font-ui-01` | Optional WOFF2 family, 1–2 weights | Readable numbers and small labels; keep a system-font fallback | Verify web embedding and redistribution terms before bundling |

### P2 — first combat and destruction kit

| Done | Asset family | Initial quantity | Requirement |
| --- | --- | --- | --- |
| [ ] | Cannon projectile and impact mark | 1 shell + 1 decal | Readable at gameplay distance; visual size does not define hit rules |
| [ ] | Muzzle flash, smoke, impact, explosion, debris | 5 reusable effects | Simple meshes/sprites; original 256–512 px atlas if needed; limited transparent overdraw |
| [ ] | Tank damage/wreck presentation | 1 damaged material variant + 1 wreck for the medium tank | Same scale/origin as the intact tank; collision/damage remain simulation-owned |
| [ ] | Road/sidewalk kit | 6 modules | Straight, corner, T-junction, crossing, sidewalk straight, sidewalk corner; snap to a 10 m grid |
| [ ] | Building kit | 2 footprints × 3 states = 6 meshes | Intact, damaged, rubble; identical placement origin and aligned foundations across states |
| [ ] | Destructible wall | 1 wall × 3 states | Intact/damaged/rubble; repeated pieces line up; support later shortcut routes |
| [ ] | Street props | 4 source props | Car, barrel, fence, lamp; add broken variants only for implemented destructibles |
| [ ] | Health and ammunition pickups | 2 meshes + 2 icons | Distinct shapes as well as colors; avoid copying franchise symbols |
| [ ] | Combat audio | 6 cue families, 2 variants each | Cannon, metal impact, ground impact, explosion, collapse, pickup; own/verify every recording |

### P3 — content expansion after the first playable combat slice

| Done | Asset family | Scope when needed |
| --- | --- | --- |
| [ ] | Light and heavy tanks | Add 2 original vehicles first, matching the existing `moto`/`goliath` stat roles; these IDs are internal placeholders |
| [ ] | Specialist vehicles | Later add the 6 remaining roles in [doc 03](03-tanks-and-weapons.md), with readable distinct silhouettes |
| [ ] | Specials and power-ups | Mesh/icon/effect/sound for each actually implemented item in doc 03; prioritize guided missile, swarm, mine, shield |
| [ ] | Team/faction identity | Start with 2 distinguishable team treatments and original emblems; expand alongside playable factions, not in advance |
| [ ] | Objectives | Original carried objective, base marker, capture-zone treatment, and convoy markers when those modes exist |
| [ ] | Regional map dressing | Reuse the base kit; add landmarks/props per playable map in [doc 08](08-levels-and-maps.md) |
| [ ] | Campaign presentation | Original character portraits, story stills, briefings, music, and optional voices for one mission before a full campaign |
| [ ] | Additional animations/LODs | Track motion, recoil, specialized deployment, and lower-detail meshes where the implemented behavior or profiling needs them |

## Visual and technical requirements

### Shared art direction

Use low-poly, chunky silhouettes with flat shading or restrained metallic/roughness materials.
Match the existing dark green/cream/orange interface, while keeping player/team colors recognizable
against terrain. Give tanks obvious forward direction and turret orientation at chase-camera distance.
Use shape and labels alongside color for pickups, teams, and map symbols. Keep text out of textures
where it should scale, localize, or remain accessible. The minimap should keep drawing live world data;
it does not need a painted map image for the current empty training ground.

### Tank and environment handoff

- Deliver **glTF 2.0 binary `.glb`**, with resources embedded, plus an editable `.blend` or equivalent master. OBJ/FBX may be authoring inputs, but are not the proposed browser runtime format.
- Use metres and Y-up in the exported runtime scene. glTF's standard forward direction is +Z; this game's tank-view root faces **+X** at heading zero. Supply a documented orientation: for a standard +Z-forward model, rotate an inner import wrapper +90° around Y. Keep the outer gameplay root free for the existing heading updates. [glTF coordinate and unit specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#coordinate-system-and-units).
- Match the current medium tank's approximate **6 m long × 3 m wide hull** and roughly **3 m overall height**; the barrel extends beyond the hull. These are visual references from `tankView.ts`, not a finalized collision box or real-world vehicle specification.
- Put the root origin at ground level under the hull center. Place the turret pivot at its rotation center and the barrel/recoil pivot appropriately. Suggested node names: `Hull`, `Turret`, `Barrel`, `Track_L`, `Track_R`, `Muzzle`. This naming contract is proposed; the current renderer does not consume these nodes yet.
- Apply/export predictable transforms; remove unintended negative scale, unused cameras/lights, hidden high-detail objects, and missing image references. Verify normals and opaque materials in the game lighting.
- A first tank needs **no skeletal rig**. Separate rigid parts permit later turret rotation and recoil. Do not bake movement along a world path into the model.
- Buildings, walls, and road pieces use the 10 m grid from doc 08. All damage stages keep the same origin, orientation, and footprint. Supply simple footprint/collision metadata as a design reference; rendering meshes do not implement collision.
- Start with standard materials, vertex colors or embedded PNG/JPEG textures, and **uncompressed geometry**. Meshopt/Draco and KTX2 require loader/decoder setup; only introduce them with a tested loading path. [Three.js GLTFLoader requirements](https://threejs.org/docs/pages/GLTFLoader).

### Initial asset budgets — proposed review targets

These are starting production targets, not enforced limits or measured runtime guarantees. Profile the
whole scene before relaxing them. Existing project goals remain **<15 MB to first match**, **<300 draw
calls per viewport**, and **60 fps at 1080p on an integrated GPU** ([doc 09](09-technical-architecture.md)).

| Asset | Initial target |
| --- | --- |
| Medium tank | 2,000–8,000 triangles; 1–3 shared materials; ≤8 mesh primitives; GLB including textures ≤2 MB |
| Small prop | 100–1,000 triangles; 1 material where practical; ≤250 KB export |
| Building state | ≤3,000 triangles and 1–2 materials; reuse atlases across the kit |
| Texture | 512 or 1024 px per side by default; 2048 only with a demonstrated visual need; tile ground rather than use a huge map image |
| Dashboard preview | ≤1280×720, WebP or JPEG; aim ≤250 KB; optional, loaded separately from gameplay |
| UI icon | SVG with a consistent viewBox; no scripts, external resources, or embedded fonts; aim ≤10 KB each |
| Short SFX | WAV master at 44.1/48 kHz; mono for positional sounds; tested MP3 runtime export, aim ≤100 KB per cue |
| Engine loop | 2–4 s, seamless, no clipped peaks or clicks; aim ≤150 KB per runtime loop |
| Music | Stereo master plus compressed runtime export; aim ≤2 MB per loop; load only when used |

Count **triangles after export**, not Blender polygons. Multiple primitives/materials can create
multiple draw calls even inside one GLB. File compression does not guarantee low GPU memory usage.
Retain lossless audio masters and inspect loop boundaries, loudness consistency, and clipping. Test
actual sound decoding in the browsers you support before accepting a format as the sole export.

## Rights and licensing checks

### Project baseline

Follow the [project IP policy](README.md#legal--ip-note-read-first): original expression, no ROM-ripped
models/textures/audio, and replace franchise-specific names/branding before public launch. Use an
original tank design inspired by a functional role, not a traced recreation of the original model,
menu, character, faction emblem, or soundtrack. The project's non-commercial rule is separate from
asset licenses; a permissive asset license does not authorize use of someone else's franchise.

For every asset, record the actual creator, source page, acquisition date, exact license/version,
license text or permission evidence, required attribution, permitted modifications, and distribution
scope. Review textures, samples, fonts, and reference inputs included in a pack independently when
they have different sources. “Free,” “royalty-free,” or “AI-generated” is not a complete rights record.

### License decision table — project intake policy

| Source / terms | Decision for this project |
| --- | --- |
| Original work you made | Preferred. Keep editable sources and record ownership and the intended asset license; verify any third-party components |
| Commissioned work | Require a written grant covering modification, browser distribution, and public source-file redistribution if needed; payment alone is not the rights record |
| CC0 | Preferred third-party starting point when the source is credible; retain provenance. CC0 does not clear third-party trademark/personality rights or warrant ownership. [CC0 terms](https://creativecommons.org/publicdomain/zero/1.0/) |
| CC BY 4.0 | Suitable when conditions are fulfilled: retain supplied notices, credit the creator, link the license/source, identify changes, and do not impose conflicting restrictions. [CC BY 4.0 terms](https://creativecommons.org/licenses/by/4.0/) |
| CC BY-SA | Review before mixing/adapting; ShareAlike applies to adaptations. Do not assume it automatically licenses the whole game or that combining assets has no obligations |
| CC BY-NC | Review actual usage and distribution; the project's non-commercial intent alone is not a substitute for checking the license |
| CC BY-ND | Avoid for assets you intend to adapt and distribute; ND restricts sharing adaptations. Pure format conversion is not automatically an adaptation |
| Marketplace / custom license | Read the exact asset terms for the intended distribution. Permission to embed in a game may differ from permission to redistribute raw source files |
| Missing license / unclear uploader / ripped asset | Keep out of the build and public repository until rights are established; replace if they cannot be established |

The SA/NC/ND distinctions above follow the [Creative Commons FAQ](https://creativecommons.org/faq/).
This table is an intake preference, not a statement that every asset under a listed license is cleared.
Resolve uncertain rights with the creator/rights holder or qualified legal advice before publishing.

**Browser distribution matters:** shipped GLBs, images, and sounds can be fetched by players.
Check both web-game distribution and repository/raw-file redistribution; do not assume bundling,
hashing, or minifying files makes a restrictive license acceptable. If raw sharing is prohibited,
do not commit the source pack; document a private acquisition/build process only if the license
allows the resulting web distribution. Otherwise choose a different asset.

**Generated assets:** retain tool/provider, model/version, generation date, applicable terms, and
provenance/permission for reference images or meshes. Keep an editable/exported master and check
for recognizable third-party logos/characters. Tool access does not by itself establish clearance
for all inputs or outputs. No generator or asset is being selected or approved by this document.

**Credits:** keep a per-asset record and, before shipping third-party assets, create a concise
`ASSET_CREDITS.md` plus credits reachable in the distributed game. Include title, creator, source,
license link, supplied notices, and modification notes as applicable. Do not relicense third-party
assets under a general code license. A repository-only credits file may not accompany a hosted build.

## Proposed file handoff and integration

These folders are a convention for the first asset integration, not an existing import pipeline:

```text
assets/source/<asset-id>/              editable masters; only if redistribution is allowed
assets/licenses/<asset-id>/            license/notices; no private receipts or personal details
packages/client/src/assets/models/    approved GLB runtime exports
packages/client/src/assets/textures/  approved runtime images
packages/client/src/assets/audio/     approved runtime audio
packages/client/src/assets/ui/        optional icons and previews
docs/assets/<asset-id>.md              completed record
```

Use lowercase kebab-case filenames with a clear variant, e.g. `tank-medium-01.glb` and
`building-brick-01-rubble.glb`. Record SHA-256 checksums for the original download and final export.
Keep private invoices/contracts outside the public repository; record only a non-sensitive reference.

Prefer Vite URL imports for runtime exports, e.g. `import tankUrl from '../../assets/models/tank-medium-01.glb?url'`
from `render/views/tankView.ts`. Vite includes referenced files in its build asset graph. Use
`public/` only when a stable filename is needed; it is copied into the distribution, so it must not
hold private source files or receipts. [Vite static asset handling](https://vite.dev/guide/assets.html).

First integration work: add GLTFLoader, load the single approved tank, show a real loading/error state,
and retain the procedural tank as a fallback. Start the existing launch countdown only when the
selected assets are ready. Add audio initialization/mute behavior separately when sound assets are
introduced. Neither integration is implemented by this documentation change.

## Acceptance checklist — repeat for every asset

Copy [asset-record-template.md](asset-record-template.md) into `docs/assets/<asset-id>.md` when you
have an actual candidate. Leave incomplete fields pending; an empty template is not approval.

- [ ] **Identity:** exact source, creator, version/date, files, and checksums recorded.
- [ ] **Rights:** license/permission evidence retained; modification, browser distribution, repository distribution, and attribution requirements resolved separately.
- [ ] **Originality/style:** no ripped/franchise-specific content; legible silhouette and consistent materials; supplied references/components checked.
- [ ] **Format:** GLB/texture/audio/SVG exports match the requirements; no missing resources or unexpected extensions.
- [ ] **3D validation:** run the [Khronos glTF Validator](https://github.khronos.org/glTF-Validator/), retain its report, resolve errors, and explain remaining warnings. Validation checks structure, not licensing or artistic quality. [Validator documentation](https://github.com/KhronosGroup/glTF-Validator).
- [ ] **In-game fit:** ground contact, size, axes, pivots, camera framing, material appearance, and required animation names verified in the actual client. For non-3D assets, check UI legibility or audio playback/loop behavior instead.
- [ ] **Performance:** record exported triangles/materials, texture sizes, bytes, and scene draw calls/frame time on a named device/browser; compare with the targets above.
- [ ] **Production delivery:** build and run the production client; no missing-file/decoder errors, remote dependencies, or accidentally shipped masters; loading/fallback behavior checked.
- [ ] **Lifecycle:** deploy, countdown, cancel, pause, resume, quit, and redeploy work; no late audio, duplicate models, or stale loading callbacks.
- [ ] **Credits and decision:** shipped credits match the asset license; record accepted / needs changes / rejected, reviewer, date, and any limitation. Tick the inventory only when accepted and integrated.

For file identity on macOS: `shasum -a 256 path/to/asset.glb`. When asset integration changes code,
run `npm run ci` as well. Passing CI does not replace visual, audio, performance, or license checks.
