# Changes Log

## S01 — Foundation (2026-10-21)
- npm workspaces: `sim`, `client`; TypeScript strict + noUncheckedIndexedAccess; Vitest.
- Sim: fixed 30 Hz world; tank movement (accel, hull/turret turn rates, reverse), wall sliding,
  rubble slowdown, tank–tank separation + ram damage, shells (swept), hitscan MG, splash with edge falloff
  and self-damage, directional armor, 3-stage destructible structures, respawn at safest spawn.
- Data: `tanks.json` (moto/m1/goliath), `rules.json`, `maps/graybox.json` (2-cell streets, central plaza).
- Client: Three.js scene, interpolated tank/structure/projectile views, chase + tactical cameras,
  occluder fading, explosions/tracers, screen shake, synthesized SFX, HUD (health, K/D, respawn).
- Controls: arcade (WASD + mouse) and twin-stick gamepad.
- Hosting: Caddy static via docker compose. `scripts/check-rules.mjs` enforces doc 12 limits.
- Tests: 18 sim tests.

## S02 — Combat content (2026-10-21)
- Specials (`data/specials.json`): guided missile (owner-steered, hull frozen, missile cam), swarm (fan of homing
  rockets that re-acquire targets in flight), mines (arm delay, hidden from enemies beyond 8 m), nuke (5 s fuse,
  map-wide falloff, flattens buildings in 40 m), stored health kit. Q/E cycle, F / right-click fire.
- Super shot: firing with stock ≥ threshold dumps the whole stack (triple-warhead guided, 16-rocket swarm, mine ring).
- Pickups (`data/pickups.json`, map letters H D A G R M N *): respawn timers, random '*' spots re-roll,
  full-HP health is stored, full stacks leave crates alone. Shield soaks damage first.
- Death drops a Star (+HP, +1 special) and the victim's selected special stack as loot.
- Gangs (`data/gangs.json`): 4 gangs, 5-tank rosters shuffled per lap with a seeded RNG, signature items
  (Atomic Paladins' nuke once per match).
- HUD: specials bar with SUPER badge, gang roster pips, shield bar, radar minimap, kill feed, nuke flash.
- Input: presses shorter than one tick are latched (fixes missed taps on slow frames). Gamepad D-pad cycles.
- Tests: 34 sim tests.

## S03 — Bots, modes, split-screen (2026-10-21)
- AI (`sim/ai`, tuning in `data/ai.json`): grid A* (8-way, no corner cutting, rubble opens routes),
  perception (vision cone + LOS, proximity, hearing last tick's gunfire/explosions, damage reveal, 8 s memory),
  utility brain at 5 Hz with hysteresis: patrol, investigate, engage (archetype range, circling, backing off),
  retreat (low HP → health crate or far spawn; flees any ticking nuke), seek pickup (value-weighted).
  Aim with lead + re-rolled error and reaction delay per difficulty. Attack tokens cap shooters per target.
  Special use per doc 06 §6.5 incl. bots piloting their guided missiles. Stuck detection backs out and replans.
- Modes (`sim/modes`): Deathmatch (kill limit, optional time limit, draws) and Annihilation (roster = lives).
  Suicides/team kills cost a point. World freezes on `matchOver`.
- Client: match-setup menu (remembers last setup), 1–4 player split-screen, classic arrow-key scheme with
  auto-aim cone, per-viewport cameras/HUD/mine visibility, pause (Esc/Start), results + rematch.
- Tests: 50 (incl. bot behaviour tests and a bots-vs-bots soak: 6 full matches, no NaN, every match ends).

## S04 — Online multiplayer (2026-10-21)
- `packages/server` (Node + ws, run with tsx): lobbies with 5-letter codes, host settings, authoritative 30 Hz
  matches, per-player input queues (dedupe, 200 ms cap, held controls repeat), 90 msg/s rate limit, 4 KB message
  cap, every message parsed through `sim/net/validate` (the trust boundary). Leavers become bots. `/health`.
- Snapshots (`sim/net/snapshot`): hot tank fields every send, meta every second, your specials only to you,
  structures and pickups only when changed. 8 tanks ≈ 1.8 KB → under doc 09's 40 KB/s at 20 Hz.
- Client: online menu (name/gang, host/join, `?join=` invite links), lobby screen, mirror world from snapshots so
  the renderer is unchanged, own-tank prediction + reconciliation, 50 ms interpolation for others, RTT display.
- Hosting: multi-stage Dockerfile (tests must pass to build), compose = game server + Caddy (static + /ws proxy, auto-HTTPS).
- `.npmrc` disables npm audit/fund on install (the audit call alone took ~100 s here).
- Tests: 58 incl. a real-socket server integration test and a prediction/reconciliation test.
- shortcut: no lag compensation for hitscan yet; no reconnect to a running match.

## S05 — QueenLord & extra modes (2026-10-21)
- Modes (`data/modes.json`): Battlelord (steal every enemy QueenLord to your fortress; rescue captives; dropped
  queens go home on owner touch or after 20 s; rescues take priority), Frenzy (neutral queen spawns at random,
  deliver for a point, first to 10), Hold 'Em (points per second held, carrier slowed), Tank Wars (3-minute timed),
  Family (first to 5, 60% damage, specials can't be switched). Optional time limit on Battlelord.
- Maps carry fortress markers `a b c d`; objective modes put one team per fortress (FFA slots are spread
  automatically, Humans-vs-Bots is kept) and respawn players at their own fortress.
- Bots: `objective` behaviour with doc 06 roles (attack / defend / roam by tank id), carriers head home
  (or keep away in Hold 'Em), everyone chases enemy carriers.
- Client: QueenLord + fortress models, objective bar (team scores, limit, clock, "your queens taken"),
  radar fortresses + queen markers, capture flash + sounds, mode labels everywhere, score limit 0 = mode default.
- Online: queens in snapshots; match start tells clients the mode.
- Tests: 71 (objective rules + bots-vs-bots soak for all 7 modes).
- shortcut: Battlelord's rail-mounted base Goliath isn't in yet; Family Mode doesn't force the Easy control scheme.

## S06 — Campaign slice (2026-10-21)
- Act I missions 1–4 as data (`data/campaign/act1.json`, rules in `data/campaign/rules.json`):
  Queens Ruins (reach + generators + raiders, hidden caches), Bridge Run (rescue a QueenLord to extraction),
  Jersey Scrapyard (three escalating waves, wingman), Pennsylvania Turnpike (hold 90 s, then clear).
- Sim `campaign/`: mission world builder, objectives (destroyAll, destroyTargets, reach, rescue, survive,
  bonus noDeaths / parTime / caches), wave triggers (start, after N s, wave cleared, point reached),
  Tank Bucks (pay to deploy, +10 per 10k points, `$` pickups, caches `C` buried under buildings, mission reward
  + bonus payouts, difficulty-scaled prices), out-of-bucks failure, scoring + S/A/B/C grade.
- Map markers: `e` enemy spawn, `X` reach, `Q` captive, `E` extraction, `T` target building, `C` cache, `$` bucks.
- AI: wingmen `follow` their leader (10–20 m, regroup, yield when crowded). A* aims for the nearest open cell
  when a goal lands inside a building.
- Client: campaign menu (progress, grades, difficulty, 1–2 player co-op with shared wallet), story briefing,
  deploy screen (pre-mission and on death, auto-picks after 8 s for pad players), debrief with breakdown,
  objectives HUD, light-column beacons + radar markers. Progress saved in browser storage.
- Tests: 84 (every mission is completed by a scripted run, plus deploy / bankruptcy / cache / wingman tests).

## S07 — Full roster (2026-10-21)
- Tanks (doc 03 roster, all in `data/tanks.json`): Hover (strafes, glides over rubble, +25% damage taken),
  Inferno (flame cone + burn damage-over-time), Rattler (homing rocket pods), Rhino (2× ram), FLP-E (laser with
  heat/overheat lock), Sentinel (mortar that arcs over buildings, snaps to enemies near the turret line, 1.5× range
  once parked). Each has its own model silhouette.
- Specials: laser (super pierces every tank on the line), plasma (super = 3-bolt fan), sentry turret (shoots back,
  can be destroyed, wall-safe placement), shockwave (knockback), Edge burst (knockback + stun), cloak (invisible
  past 10 m, breaks on firing, bots and turrets can't see you), speed boost, teleport (stops short of walls),
  repair drone. All also appear as map pickups (L P U K V F J Y Z).
- Gangs: all 10 from doc 03 + the hidden Edgeborn (not selectable yet). Signatures updated to match.
- Status effects (burn / stun / cloak / boost / repair) with visuals and a HUD status line; heat gauge for lasers.
- Hover controls: A/D (or left stick X) strafe while the hull turns to face your aim.
- AI: brawler + artillery archetypes, rules for every new special, cloak respected by perception. Idle bots hunt
  the nearest enemy on radar (original MP radar is always on) — fixes end-game stalemates seen in the soak test.
- Snapshots: status effects only when active; heat only to the owner. Still < 40 KB/s at 8 tanks.
- Tests: 95.

## S08 — Progression (2026-10-21)
- Shared, pure progression in `sim/progression` (tuning in `data/progression.json`): match stats from events
  (kills, deaths, structure collapses credited to whoever brought them down, specials, pickups, queen captures),
  XP per doc 07 (kills, objectives, completion, victory, campaign mission + grade, first win of the day,
  bots-only ×½), levels 1–50 on 500 + 150×L, unlock track (gangs, tanks, perk slots, titles), tank mastery 1–10,
  three daily challenges (same set for everyone each UTC day), `applyMatch` folding a match into a Profile.
- Perks (8 sidegrades, each with a real downside) wired through HP, speed, ramming, fire rate, special capacity,
  pickups, armor, damage dealt/taken, structure damage, AI hearing and queen carrying. Off = Classic.
- Guest play (local): profile in browser storage, XP panel on results/debrief, profile screen (level bar, next
  unlocks, perk loadout limited by slots, title, challenges, mastery, career totals), locked gangs/tanks shown 🔒.
- Online: signed guest tokens (HMAC, `SERVER_SECRET`), server-side profiles (atomic JSON files in `DATA_DIR`,
  Docker volume), perks trimmed to what the server profile has unlocked, XP awarded by the server at match end
  and pushed to clients. `sql/schema.sql` sketches the MariaDB store for later.
- Fixed: lobby Start silently blocked by form validation (score limit min 1 vs new default 0).
- Fixed: daily-challenge picker could loop forever (float overflow in the hash; now Math.imul + bounded loop).
- Tests: 110.
- shortcut: no OAuth yet (guest tokens only); split-screen P2–P4 don't earn XP; file store instead of MariaDB.

## S09 — Arenas, touch, settings & accessibility (2026-10-21)
- Four new arenas (doc 08): Fortress Twin, Neon Strip, Bay Span, Plains Depot. Arena picker in menu and online
  lobby; the server builds the chosen map and tells clients which to load.
- Water (`~`): blocks tanks but not hovers or shots; hover-aware A*; rendered as instanced tiles + on radar.
- Tests: every spawn/fortress on every arena reachable by a normal tank; bots-only deathmatch soak per arena.
- Touch controls: twin virtual sticks (push the aim stick to the rim to auto-fire) + Fire / Special / Next /
  Camera buttons; auto-selected on phones and tablets, local and online.
- Settings screen: volume, graphics quality (Low = no shadows/AA, pixel ratio 1), colour-blind team palette
  (Okabe–Ito, applied to tanks, queens, fortresses, turrets, radar, HUD, team names), reduced motion (no shake
  or nuke flash; defaults from the OS setting), keyboard rebinding with capture.
- Compact HUD on small screens.
- Tests: 120.

## S10 — Enhancement modes (2026-10-21)
- King of the Rubble: zone (radius 12) at a random open spot, moves every 60 s; a team alone inside scores
  1 pt/s, contested scores nobody; first to 100. Ring + light column tinted by holder, radar circle, move timer.
- Horde: everyone (humans + ally bots) on one team vs waves sized by doc 06's budget
  (10 + wave × 6 × players^0.8; light 1 / medium 2 / heavy 3 / special 3), specials from wave 3, a Warlord pair
  every 5th wave (+1 shared life after it), bot skill rising with the wave; 5 shared lives; survive the limit
  (default 15) to win. Wrecks from cleared waves are removed so long games don't grow.
- Bots play the zone (attack/defend roles push in, roamers drift); Horde reuses their normal combat.
- Mode `allTeam` option for co-op modes. Changing mode resets the score limit to that mode's default.
- Tests: 128 (zone scoring/contest/move, wave budget and boss composition, horde win/lose, soak for both).

## S11 — Campaign: rest of Act I + bosses
- Act I now has 12 missions. New objectives: stop runners (escaping enemies lose the mission) and destroy turrets. New map markers: `O` exits, `u` enemy turrets.
- The Warlord boss tank (class "boss", rear armour ×2) is driven by `campaign/boss.ts` and has 3 phases: it summons adds, enrages, fires a telegraphed artillery barrage (`strikeWarn`, 1 s fuse) and sends out a shockwave when you get close. Killing it is worth 5000 points.
- Client: Warlord model, red strike-warning rings, a boss health bar showing the phase, phase alerts in the kill feed, and boss sounds.
- Fix: a wingman whose leader died between 5 Hz thinks crashed the follow behaviour; it now holds until the brain re-picks (regression test added).
- Fix: muzzle offset on turrets so ownerless turrets no longer hit themselves.
- Tests: 150 passing. Headless browser smoke of mission 12 (boss bar, phase 3, no errors).

## S12 — Last Gang Standing + Siege
- **Last Gang Standing** (`lastGang`): one life per round. The last team alive takes the round, everyone comes back after a 4 s break, and the first team to 3 rounds wins. A `round` event feeds the kill feed, and the HUD shows the round number and the break countdown.
- **Siege** (`siege`): always two teams. Defenders (team 0) guard a 2500 HP core built on their fortress cell. Attackers win if the core falls; defenders win when the 4-minute clock runs out. Bots attack and shoot the core, or fall back to defend it once they are more than 25 m away. Core HP rides in `ModeState` so online snapshots carry it.
- New mode rule `teamCount` fixes the number of teams for fortress modes.
- HUD: a dead player who won't respawn now sees "out until the next round" or "out of tanks — spectating" instead of a fake redeploy timer.
- Tests: 155 passing. Browser smoke of both modes with no errors.

## S13 — Replays
- `sim/replay`: a replay is the setup (map, slots, seed, mode, perks) plus each human's inputs, stored only on ticks where they change and packed into small integer tuples. Because the sim is deterministic, playback rebuilds the match exactly. Inputs are quantised before the live sim sees them, so recording never drifts.
- Every local versus match records itself. The results screen gets **Watch replay** and **Save replay** (downloads `.replay.json`). The menu gets **Watch last match** and **Open replay file…**.
- Playback: a spectator camera with Tab to cycle tanks, 1/2/3 for 1×/2×/4× speed and Esc for the menu.
- Verified: a replay recorded in Chromium, re-simulated in Node, is bit-identical at the same tick. A 3-minute match is roughly 100–200 KB.
- Not covered: campaign and online matches don't record yet.
- Tests: 157 passing.

## S14 — Audio pass (placeholder set)
- `scripts/gen-audio.mjs` makes an original sound set from code, with no third-party samples. That's 40 SFX covering weapons, impacts, buildings, specials, pickups, tank spawn and death, low-HP alarm, boss, stingers (win, lose, wave, round, zone, QueenLord) and UI. It also makes two seamless music loops (menu at 84 bpm, battle at 132 bpm). Output is deterministic.
- `data/audio.json` sets per-sound volume, pitch jitter and voice limit. A test checks the manifest and the files match.
- Sample-based engine replaces the noise-burst synth. It has sfx and music buses, positional volume, stereo pan relative to the chase camera, pitch jitter and voice limits. Music crossfades (menu, then battle). The player's engine loop follows speed. Buttons click.
- Now voiced: hit, shield hit, kill, spawn, mine, specials by kind, low-HP beep, and a win/lose stinger.
- Settings: separate Sound effects and Music sliders that apply live.
- Not covered: the online lobby keeps playing battle music after a match. MP3 loops may have a tiny seam on some browsers.

## S15 — Cockpit camera
- New `cockpit` view: the camera sits just behind and above the turret hatch, so you look down the hull with the barrel in frame. It's close to first person. Height and offset scale with the tank's radius, so a Moto and the Warlord both frame correctly.
- V (or a gamepad's Back button) now cycles chase → cockpit → top-down, in both local and online matches.
- The cockpit view follows the hull's facing, not the turret, so mouse aim doesn't feed back into the camera and spin it. It follows tighter than chase, with no positional lag.

## S16 — Code review pass
Went over all 223 TypeScript files. The structure is healthy: the largest source file is under 200 lines, and the sim stays pure with no DOM or Node APIs. The remaining shortcuts are tracked as `shortcut:` comments. Fixed:
- **Server trust boundary.** Locked gangs could be picked by any client; the server now enforces unlocks with `legalGang`, as perks already did. Non-input messages (hello, create, ping…) had no rate limit; they're now capped at 20/s. Server-wide lobby cap of 500.
- **Replay files are untrusted.** `isReplay` now validates every slot (team, tank kind, gang, difficulty, perks) and the mode, so a bad shared file can't crash the game.
- **HUD performance.** Panels rebuilt `innerHTML` every frame. `setHtml` skips the DOM write when the markup is unchanged.
- Dependencies are current. `npm audit` can't run from this sandbox (no registry audit endpoint).
- Tests: 161 passing, including 2 new server trust-boundary tests.

## S17 — Replays for campaign and online
- Replay format v1 gains `mission` (mission id + opening purchase + seed) and `actions`: timed world changes that aren't inputs. A tank kind means a campaign redeploy; `"bot"` means a player left and a bot took the tank over.
- Campaign missions record themselves. The debrief has Watch/Save replay, and the mission also becomes "last match" in the menu.
- Online matches are recorded on the server, which is authoritative and sees every input. Each player gets the replay when the match ends. Results offer Save, and the menu's "Watch last match" plays it.
- Fix: server inputs are now quantized at the trust boundary (`sanitizeInput`), and the client quantizes before predicting and sending. Before this, the server sim used unrounded inputs and couldn't be re-simulated exactly.
- Campaign mission data moved into the sim (`campaignMissions`, `missionById`).
- Tests: 163 passing. They check that a mission with redeploys and a server match with a dropout both re-simulate bit-identically.

## S18 — Battlelord rail Goliath
- Each fortress gets a straight track on the row beside it, built from the map at setup, up to 9 cells long and stopping at walls and water.
- **Man it:** park a team tank on the track for 0.8 s. While riding, the hull is locked to the track, W/S slides it (with end stops) and the turret aims freely. The rider fires the rail Goliath's heavy shell (55 dmg, splash 3, range 85) and takes ×0.6 damage behind the car's plating.
- **Leave it:** humans hold a hard turn for 0.5 s to hop off. If the rider dies, the gun frees up. QueenLord carriers can't mount, and enemies can't use your rail.
- **Bots:** defend-role bots go and man a free rail, as doc 06 §6.7 asks, then fight from it.
- Shared code: the sim uses `gunOf()` everywhere a tank's gun was read (firing, bot aim and range checks). Movement is shared with client prediction, so online riding predicts correctly. Riders sync in snapshots by rail index.
- Client: twin steel rails and an empty team-coloured gun car (hidden while ridden). HUD hints for "park to man it" and the controls while riding. Mount/dismount sounds.
- Tests: 167 passing (4 new rail tests).

## S19 — MariaDB store + sign-in
- `ProfileStore` is now async. It has an atomic `update(id, fn)`, so two matches ending together can't lose XP, plus `findIdentity`/`linkIdentity` for sign-in. Awards and identify are async.
- **MariaDB** (`persist/mariaStore.ts`, mysql2): used when `DATABASE_URL` is set. Tables are created from `sql/schema.sql` on boot (new `identities` table). `update` locks the row in a transaction; the row is inserted before the lock so concurrent first-time updates don't deadlock on a gap lock. The file store remains the no-database default.
- **Sign-in** (`auth/oauth.ts`): authorization-code flow for Discord and/or Google, enabled by env credentials plus `PUBLIC_URL`. State is a single-use random nonce with a 10-minute TTL and a cap on pending entries. Every provider response is validated. The first sign-in links the current guest; later sign-ins resume that player on any device. The flow ends in a normal signed player token, so the rest of the server is unchanged.
- **Client:** "Sign in with …" buttons in the online menu (only for configured providers) and handling of the return from the provider. Fixed unescaped text in the online menu (saved name, error message).
- **Deploy:** compose runs `mariadb:11` with a healthcheck. The game gets `DATABASE_URL`, `PUBLIC_URL` and provider vars. Caddy and the Vite dev server proxy `/auth/*`.
- **Verified** against a real MariaDB 10.11: store contract tests (memory, files, MariaDB; 10 parallel updates keep every XP point; first identity link wins) and a two-browser online match with the server on MariaDB. Sign-in flow tested end-to-end against a fake provider.
- Tests: 176 passing (179 with `TEST_DATABASE_URL`).
- Not done: no real Discord/Google app was available to try, so check the first live sign-in. Match history tables (`matches`, `match_players`) exist but aren't written yet.

## S20 — Docker build verified
- Both images build and run: `server` (the build stage runs `npm run check`, where all 176 tests pass inside the image) and `web` (Caddy + client).
- Verified end-to-end through the containers:
  - Caddy serves the client, audio and `/health`, and proxies `/ws` and `/auth/*`.
  - The game container boots on MariaDB and creates its tables.
  - Two browsers joined a lobby through port 8080.
  - A full match against bots ended with the XP award written to MariaDB and the replay delivered.
  - The container healthcheck reports `healthy`, and `docker compose config` validates.
- Dockerfile: base images are now build args (`NODE_IMAGE`, `CADDY_IMAGE`) for registry mirrors or pinned digests. Defaults are unchanged.
- New `scripts/smoke-match.mjs <ws-url>` plays one short match against a running deployment and waits for the award, for a post-deploy check.
- Caveat: this sandbox can't reach Docker Hub, so the build ran on stand-in base images (the host's Node 22 + glibc + busybox, and the official Caddy 2.10.2 binary). The real `node:22-alpine` uses musl; the lockfile includes the musl native bindings that Vite/Vitest need, so it should behave the same. Run one real `docker compose build` to confirm.
- Not done: the server image ships dev dependencies and sources (~660 MB) because it runs TypeScript through tsx. A compiled or pruned image is a later optimisation.

## S21 — Campaign Act II
- 12 new missions (a2m1–a2m12, "The Long Road East"), following doc 04 §4.5: Bay Assault, Desert Escape, Midwest Rally, Capitol Siege, Atlantic Port, London Docks, Thames Embankment, Paris Boulevards, Catacomb Approach, Rhine Bridgehead, Berlin Wall Line, and the Edge Spire final boss. They use every objective type, including decoy rescues, runners, turrets and a hard Warlord.
- Authored in `scripts/build-act2.py` so the maps stay readable as ASCII. It writes `data/campaign/act2.json`.
- New mechanics: `m` map marker for pre-laid enemy mines (catacombs); mission `fog` (0..1) pulls the scene fog in (London Docks). From Midwest Rally on, the freed driver rides with you as an extra Inferno wingman.
- Campaign menu groups missions by act. The sim's `campaignMissions` now covers both acts.
- **New data test: every mission must be drivable.** A flood fill from the player spawn must reach every spawn, objective marker and target (walls count as breachable). It caught 4 broken Act II layouts and one real **Act I bug**: in a1m10 an enemy spawn was sealed in by the cache building, so those enemies could never leave. Moved the cache one cell.
- Tests: 224 passing. Every one of the 24 missions passes markers, reachability and scripted completion.

## S22 — Ranked play (Glicko-2)
- `progression/glicko.ts`: Glicko-2 rating, matching the worked example in Glickman's paper (1464.06 / 151.52 / 0.05999). One ranked match is one rating period, and FFA finishing order becomes pairwise wins, draws and losses. Leaderboards show a conservative rating (r − 2·RD), so newcomers start low.
- **Ranked lobbies:** a host checkbox. The server pins them to humans-only, free-for-all, perks off, in a mode with a clear finishing order (Deathmatch, Tank Wars, Last Gang Standing, Annihilation). It needs at least two players; that refusal now shows inside the lobby instead of kicking you to the menu.
- **Ratings:** the server rates everyone from the authoritative world, by team score then kills. Quitters are rated as last and get no XP. Results show "Rating 1234 (+18)".
- **Leaderboard:** `GET /leaderboard` (top 20) is implemented in all three stores; MariaDB ranks from the JSON column, with a `shortcut:` note on adding an index later. The online menu has a "Ranked leaderboard" view. Profiles remember the last name used online.
- Caddy and the Vite dev server proxy `/leaderboard`.
- Tests: 229 passing (Glicko vectors, ranked placement and awards, leaderboard in the store contract including MariaDB). Browser smoke covered the lobby checkbox, the solo-start refusal, a two-player ranked start and the leaderboard view.

## S23 — Map editor + shared arenas
- **In-browser editor** (menu → Map editor): paint ground, buildings, breakable walls, water, spawns, up to 4 fortresses and every pickup on a 12–40 × 8–24 grid, by click/drag (pointer events, so touch works). Right-click or the ␣ tile erases. Width and height resize while keeping what's painted. Problems show live, and Test drive / Share stay disabled until the map is valid.
- **Validation** (`sim/data/mapCheck.ts`, shared by client and server): size, rectangular rows, a tile whitelist (no campaign markers), ≥2 spawns, one of each fortress, and every spawn reachable from the first (walls count as breachable). All five built-in arenas pass. Each arena gets a **content-addressed id** (`c-…`), so the same layout is the same map everywhere.
- **Save / test / share:** arenas are saved in the browser (re-validated on load) and appear in the Arena list for local matches and online lobbies. Test drive plays your usual setup on the arena. Share copies a `?map=CODE` link (base64url, unicode-safe) that opens the arena in the recipient's editor. Codes can also be pasted.
- **Online:** a host can pick their own arena. It travels in lobby settings (re-validated by the server), the server sends it to every player at match start, and it's embedded in the match replay. Local replays on custom arenas embed it too.
- Shared `esc()` helper replaces three copies.
- Tests: 237 passing. Browser smoke: paint with a drag, name, share, test drive on the custom arena, and open the share link in a fresh browser.

## S24 — Rename / legal pass
- **`data/names.json`** holds every player-visible name for things the original games named. Change a name there and it changes everywhere. Internal ids (`battlelord`, `goliath`, `queen`…) are code, never shown.
  - QueenLord → **Oracle**, Tank Bucks → **Scrap**, the Edge → **the Rift** (Riftborn, Rift Spire, Rift pickup).
  - Modes: Battlelord → **Oracle Raid**, Family → **Rookie**, Hold 'Em → **Keep Away**.
  - Tanks: Moto/M1/Goliath/Hover/Inferno/Rattler/Rhino/FLPE/Sentinel → **Scout/Ranger/Behemoth/Skimmer/Torch/Viper/Ram/Lancer/Howitzer**. The rail Goliath is now the **rail cannon**.
- Campaign, progression and gang text rewritten to match. The Act II source script too, so regenerating can't bring the old names back.
- **`scripts/check-ip.mjs`** is part of `npm run check`. It fails the build if an original name (BattleTanx, QueenLord, Tank Bucks, Battlelord, Griffin Spade, Madison, Cassandra, Storm Ravens, the Edge, Goliath, Moto Tank, 3DO) appears in data text or in client code outside comments. Docs, README and this log may still name the originals, since they describe the homage.
- Not decided: the game title stays **Re-Tanx** (in `names.json` and `index.html`). It echoes "BattleTanx", which the docs' legal note says to rename before a public launch. Choosing the title is up to you; the docs' working title was "Treadlord".
- Not done: an actual legal review. This pass lowers takedown risk; it doesn't remove it.
- Tests: 237 passing. Browser check: mode list, deploy screen and currency show only the new names.

## S25 — Hitscan lag compensation
- `sim/systems/lagComp.ts` (server only, `world.lagComp`). Each tick, after movement, the server stores every tank's position for the last 8 ticks (~250 ms). An instant-hit shot (machine gun, laser gun, laser special) is resolved with the other tanks moved back to the tick the shooter was looking at, then put back. Tanks that weren't on the field at that tick can't be hit. Walls and buildings aren't rewound.
- The client sends `view` with every input: the tick its interpolated view of other tanks is showing, worked out from the last two snapshots. The server parses it at the trust boundary and clamps it to the rewind range at fire time, so a laggy or lying client can't reach further back than 250 ms. Bots, including ones that took over a seat, always shoot in the present.
- Replays: inputs carry an optional 8th value (view offset), and online replays set `lagComp: true`, so lag-compensated matches still re-simulate bit-identically.
- Projectiles (shells, rockets, mortars, flame) aren't rewound. They travel in the world everyone shares, which is the usual trade-off.
- Tests: 241 passing. A shot at where you saw a fast crossing target misses without compensation and hits with it; over-old claims are clamped; replays match.

## S26 — Rejoin after a disconnect
- **Server:** a dropped connection (socket closed, as opposed to "Leave match") leaves the seat claimable for 60 s (`PROTOCOL_LIMITS.rejoinGraceMs`). A bot drives the tank in the meantime. If nobody is left, the match keeps running for the grace period instead of closing, so a lone player whose wifi blinked can come back.
- `{ t: "rejoin", code }`: the same player (matched by the profile id behind their signed token, never by name) reclaims their tank. The bot is removed, the input queue is fresh, and the next snapshot is a full one. Someone else's token, an expired grace period, or having left on purpose gets an error.
- `rejoin` waits for `hello` to finish identifying the player, so hello + rejoin can be sent back to back.
- **Client:** if the socket drops mid-match it shows "Connection lost — rejoining…" and retries every 2 s for the grace period. After a page reload or crash, the online menu offers "Rejoin your match (CODE)" for 15 minutes, and the server decides whether the seat is still there.
- Replays: a new `"human"` action marks the moment a player took their tank back, so matches with a dropout and a rejoin still re-simulate exactly. Ranked: a player who rejoined before the end isn't counted as a quitter.
- Tests: rejoin with your own token gets the same tank and a full snapshot; a stranger's token and an intentional leave are refused. Browser smoke: drop the socket mid-match → automatic rejoin into the same tank, then reload → "Rejoin" button → same tank.

## S27 — Match history
- Every online match is recorded when it ends: mode, arena, start and end time, winning team, ranked flag and bot count. For each human: name, team, gang, kills, deaths, XP awarded, finishing place, whether they left early, and rating change. Bots are counted, not stored.
- **MariaDB:** writes the existing `matches` and `match_players` tables in one transaction. New columns are added with idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, plus a `(player_id, match_id)` index, so older databases upgrade on boot. The file store appends to `matches.jsonl` (with a `shortcut:` note that MariaDB is the option beyond a few thousand matches). The memory store keeps an array for tests.
- **`GET /history`**: your last 20 matches, newest first. It needs `Authorization: Bearer <your player token>` and only ever returns the token holder's own matches (401 otherwise). Proxied by Caddy and Vite.
- **Client:** "Match history" in the online menu shows when, mode (★ = ranked), arena (custom arenas by name), place, K/D, XP and rating change.
- `scripts/smoke-match.mjs` now also checks the match landed in history.
- Verified against MariaDB end-to-end: a match played through the proxy produced rows and showed up in `/history`. Tests: 246 passing (history contract across all three stores, awards recording, endpoint auth).

## S28 — Quick match + public lobbies
- **Quick match** (online menu, primary button): `{ t: "quick" }` drops you into the fullest open public lobby that hasn't started, or opens a new one (casual deathmatch, 3 bots). Private lobbies and matches already running are never joined this way. Join-by-code still works for every lobby.
- **Public lobbies** (`settings.public`, a host checkbox) start by themselves: 30 s for a lone player (bots fill in), 15 s once there are two or more, 3 s when full. A new player can only bring the start forward. Going private cancels the timer. After a match, a public lobby rolls into the next countdown. Ranked public lobbies wait for a second player. The host can still start early.
- Lobby messages carry `startsIn`, and the lobby screen counts down locally between updates.
- Lobby timers are cleared when a lobby closes and when the server stops. The quick-match logic lives in `lobby/quickMatch.ts`.
- Tests: 251 passing (fullest lobby first, never into private or running ones, timer rules with fake clocks, ranked waits). Browser smoke: two players pressing Quick match land in one lobby, see the countdown, and the match starts by itself.

## S29 — Convoy mode
- **Rules (doc 05, Global Assault):** two teams. Protectors escort 3 trucks along a road from their fortress to the enemy's (A* over the map at round start); attackers destroy them. A truck only rolls with a protector within 25 m, keeps its spacing to the truck ahead, and backs off and turns if it's been shoved into a wall. A truck that reaches the far fortress is delivered (+1). The round ends when no trucks are left or after 150 s. Round 2 swaps sides and direction, with everyone respawned. Most deliveries wins; a tie is a draw.
- **Trucks are tanks** (kind `truck`, class `convoy`, 260 HP, no gun, roof hatch instead of a turret), so every weapon, splash, AI target pick, kill feed, minimap, snapshot and replay path already handles them. The mode drives them; they never respawn, don't pick up items, aren't selectable anywhere, and are left off the results table.
- **Bots** (doc 06 §6.7): protectors go to the nearest truck when more than 12 m away. Attackers set up three waypoints ahead of the lead truck; roamers chase it.
- **HUD:** "round 1/2 · Blue escorts · 🚚 3 · 144s" plus a hint for your role. "Truck 2 got through!" in the kill feed with a delivery sound. A boxy hauler model.
- Tests: 255 passing (setup on the road, escort rule, delivery, side swap and winner, bots move the convoy). Browser smoke on the Fortress map.

## S30 — Docs brought up to date
- Project docs rewritten against the code as it stands (✅ built / ⏳ planned):
  - 05 Multiplayer: Convoy rules as built, quick match and public lobbies, ranked, rejoin, match history, anti-cheat facts.
  - 06 AI: build status per behaviour, archetype and mode role, including Convoy escort/ambush and rail cannon.
  - 07 Progression: the real unlock track, ranked rating, match history.
  - 08 Maps: the map format as built, derived mode layout, map editor.
  - 09 Architecture: as-built netcode with lag compensation and rejoin, topology and endpoints, actual schema, testing, replays.
  - 10 Roadmap: milestone status.
  - 11 Plan: every checkbox ticked or annotated against the repo; stack table shows what changed (Web Audio, custom lint scripts).
  - 12 Code architecture: the real module maps and the reasons for deviations.
  - 13 Status: S25–S29 summary and open items.
  - README: index, rename table, ✅/⏳ convention.
- Repo README updated for quick match, rejoin, history, lag compensation, endpoints and all modes.
- Perk display name "Queen's Champion" → "Oracle's Champion" (missed by the S24 pass because the guard only matched "QueenLord").

## S31 — Map authoring guide + docs in the repo
- `docs/14-map-authoring-guide.md`: map format and limits, full tile legend, destruction stages (intact / damaged / rubble) with heights and colours, editor rules, final art asset specs (three .glb per destructible), design guidelines, pre-share checklist.
- `docs/map-templates/starter-yard.json`: 24×15 starter arena (4 spawns, fortresses a/b, water, walls, pickups); passes `checkMap`. Share code in doc 14.
- All design docs (01–14 + README) now ship in the repo under `docs/`, in sync with the claude.ai project.

## S32 — Docs reorganised and re-checked against the code (2026-10-22)
- `docs/` is grouped by reader, keeping the 01–14 numbers so "doc NN" references still resolve: `design/` (01–08), `engineering/` (09, 12), `planning/` (10, 11, 13), `guides/` (14 + `map-templates/` + new `self-hosting.md`). `docs/README.md` is the index.
- New `docs/guides/self-hosting.md`: Compose services, every environment variable, storage choice, sign-in setup, HTTP endpoints and limits, smoke test, running without Docker. The repo README now points there instead of carrying the detail.
- Docs 02, 03, 04 and 07 got status lines and were checked line by line against `data/*.json` and the code. Corrected: pickup respawn timers (speed/cloak/teleport/repair are 40 s), plasma super shot (3-bolt fan), Queen's Guard signature (guided only), Reinforced Treads and Oracle's Champion downsides, no assist XP, daily challenges only (no weekly), challenge XP range 200–600, Act II title ("The Long Road East"), final mission name (Rift Spire), campaign scoring values and grade thresholds, boss details, death explosion deals no damage. Added the Warlord and Truck kinds and on-screen names to the roster table, and marked radar/points pickups, the Easy control scheme, hit markers, hit-stop, enemy damage scaling and the Battlelord campaign difficulty as not built.
- Verified: 255 tests in 39 files pass; 254 TypeScript files; largest source file 193 lines; 40 SFX files.
- Removed a stale `shortcut:` comment in `server/match/match.ts` that still said lag compensation and reconnect weren't built (S25, S26).
- Repo-root README now explains the layout (`re-tanx/` is the game, `OLD/` is archived drafts).

## S33 — Responsive controls, cheaper rendering and a clearer start menu (2026-10-22)
- Moved all five supplied logo assets into the client's public files with verified file hashes, then removed the empty `Logo Assets/` source directory. The full logo appears in the desktop menu, the transparent wordmark on compact screens, the tank icon in pause menus, and the ICO in browser tabs. The black-background wordmark remains available with the other branding files. Images keep their original pixels and use intrinsic dimensions/asynchronous decoding.
- Start menu leads with **Play now**, **Campaign** and **Play online**, each explaining what it starts. Local settings and replay/editor tools expand on demand. The current setup and device-specific controls are visible; Settings has a text label. Native Tab/Space navigation works in menus, and typing in controls no longer feeds gameplay input.
- Local and online player tanks preview live movement/aim every rendered frame with a fractional `moveTank` call on copied state, removing the previous one-tick interpolation delay. Collision and movement limits remain in the shared sim; replay input consumption and 30 Hz rules are unchanged. Preview reads preserve keyboard/mouse/touch/gamepad action edges. Fire presses no longer linger after release, pointer clicks update aim immediately, and blur clears keyboard/mouse state.
- Catch-up work is bounded to two simulation steps per frame; visibility changes reset elapsed time. HUD/radar updates run at 20 Hz, without reallocating the minimap canvas every draw. Buildings use one instanced opaque batch plus a small transparent batch for occluders, with box intersections instead of per-building triangle raycasts. Match teardown cancels frames and frees scene GPU resources; online teardown also cancels pending results UI.
- **Performance** graphics defaults to CSS resolution without shadows/AA. Existing graphics preferences are retained; **High detail** caps pixel ratio at 1.5 and uses a 1024px shadow map. Renderer requests the high-performance GPU.
- Server input bursts use the newest movement immediately, retaining short fire/special taps and the last cycle direction instead of processing stale movement for up to six ticks. Online pause sends neutral input; controller Start toggles pause online too.
- Measurement on this machine, headless Chrome 151, 1440×900 viewport at device scale 2: a 5-second default-arena/three-bot drive improved median frame interval **50 → 16.7 ms** (~20 → 60 FPS), p95 **66.8 → 16.8 ms**, median callback CPU **5.5 → 0.7 ms**, p95 CPU **15.8 → 2.4 ms**. Fresh defaults were used before/after, including the graphics change. A separate 20-input/no-bot steering test measured median synthetic key-event-to-rendered-pose delay **42.8 → 14.2 ms** (High detail after: **14.4 ms**). These are local browser measurements, not physical input-to-display or internet-latency guarantees.
- Verification: rules/IP guard, TypeScript, production build; 262 tests including new bounded-loop, non-mutating preview, action-latch, instanced-destruction/viewport and input-burst regressions. Browser smoke covers keyboard navigation, local launch/movement, pause/resume, split-screen controls, 320/390/844px menus, settings, campaign navigation, online host/start/pause/leave and repeated match teardown with no page errors.

## S34 — One-command instance updates (2026-10-22)
- Root `update.sh` fetches and fast-forwards the current upstream, builds before restarting Compose `game`/`web`, preserves the database container/volume and local environment, waits for readiness, and checks Caddy's static route plus proxied game health. Clean-checkout/upstream guards and a per-checkout lock prevent accidental overwrites and concurrent updates. Failures exit nonzero; rerunning retries the build/deploy even if Git is already current.
- `.env` files are excluded from Git and Docker build context. Root README and self-hosting guide document first-time setup, normal updates and recovery.
- `scripts/test-update.sh`: offline integration tests using real temporary Git remotes/clones and mocked Docker cover fast-forward/self-update, paths with spaces, preserved `.env`, deployment command order, build/restart/health failures, retries, dirty/ahead/diverged/detached checkouts and lock cleanup. Bash syntax checks and Compose configuration validation pass; no live deployment is performed by this test.

## S35 — Decomp pass and pre-match count-in (2026-10-23)
- Read the N64 decompilation and static recompilation added under `oggame/`. Neither contains game audio, textures, models or levels (the only image of the game is the recomp launcher's screenshot background), so no original assets were added; the no-ripped-assets rule stands. New `docs/design/15-decomp-findings.md` records what the code says instead: countdown timeline, tank HP and size, damage formula, weapon refire table, pickup effects, breakable/explosive props, rebuilding fortress guns, level list, front-end options, squad orders, and a gap table for Re-Tanx. Doc 01 *(verify)* items for the 1998 game's level count and pickup list are now marked *(decomp)*.
- Pre-match count-in, built to the original's timeline: `data/rules.json` `countdown` (18-tick beats × 5 = 3 s). `ModeConfig.countdown` sets `ModeState.countdown`; while it runs `stepWorld` only counts down (`systems/stepCountdown.ts`) and emits one `countdown` event per beat. Local matches, campaign missions (`MissionStart`/`MissionSetup.countdown`, so new campaign replays carry it) and online matches (server `createMatch`) turn it on; replays without the flag play back unchanged. Client prediction and the per-frame movement preview hold still during it. HUD `hud/countdown.ts` shows the arena or mission title, then 3-2-1 and GO!; new procedural `countdown_beep` and `countdown_go` sounds.
- `scripts/gen-audio.mjs id …` rewrites only the named sounds (no wipe, no music, no ffmpeg); regenerating `pickup` reproduced the committed file byte for byte.
- Verified: rules/IP guard, TypeScript, 265 tests in 45 files (new: count-in holds the world, emits beats 4…0, is off by default, replays bit-identically; server test now checks matches open with the count-in). Headless Chromium on `?quick` (no input sent): title → 3 → 2 → 1 → GO! → hidden.

## S36 — Deliberate driving, pickup pictograms, brick walls (2026-10-23)
- Driving: braking (slowing down or reversing, in either direction) is now `rules.json` `brakeFactor` = 4× acceleration; it was 2× forward and only 1× when backing off a reverse, so tanks coasted. Steering keys (WASD and arrows) ease into a full-rate turn over `keySteerRamp` = 0.2 s and stop dead on release or reversal (`control/steerRamp.ts`, kept per local player and advanced only on sim ticks, so the frame preview and replays agree). Sticks, touch and hover tanks are unchanged; bots are unaffected by the ramp. Matches the original's feel: an analog stick eases the hull into turns (doc 15).
- Pickups: every crate face is a code-drawn pictogram (cross, shield, bullets, missile, rockets, mine, trefoil, star, gear, beam, orb, sentry, bolt, slashed eye, chevrons, portal, wrench, diamond, ?) in white with a dark outline on the kind's colour inside a dark frame (`render/views/pickupIcons.ts`), replacing single letters. Dropped loot shows the icon of the special it holds. A few tile colours were darkened for contrast; the radar uses the same colours.
- Walls: code-made brick models for all three stages per doc 14 §6, inside the 10 × 10 m cell: footing, staggered brick courses and a concrete cap (3 m); broken stubs, holes and loose bricks (~1.6 m); scattered blocks on a dust pad (<1 m). One instanced batch per stage, a quarter-turn per cell for variety; walls are never faded (they don't hide the tank).
- Verified: rules/IP guard, TypeScript, 268 tests in 46 files (new: braking stops at brakeFactor in both directions, key-steer ramp, walls show their stage model and never fade). Headless Chromium on graybox: icon sheet of all 19 crate faces, and chase-camera shots of intact, damaged and rubble walls with crates.

## S37 — Live XP, tank ranks, weapon levels, profile redesign (2026-10-23)
- In-match progression (`hud/liveProgress.ts`): the profile owner (P1 locally, you online) gets an XP strip at the bottom of the screen that fills per kill, a "+XP" pop, and stacked banners for **Level up**, **<tank> rank up** and **<special> upgraded**, with a `ui_confirm` sound. Counting matches `stepStats` / `matchXp` (enemy kills only; bot-only matches pay half, campaign full), so it agrees with the end-of-match award, which then adds the completion and victory XP. Reduce-motion swaps the animations for a fade. Off in replays.
- Weapon levels (Ratchet & Clank style): every special has V1–V5 from weapon XP, +1 per use and +3 per kill made with it (`progression.json` `weaponXp`, `weaponLevels`). Kills now name the special that did it: `DamageHit.weapon` / `Splash.weapon` / `damageAt(…, weapon)` / `hitStructure(…, weapon)`, set by missiles (guided, swarm), mines, nuke, laser, plasma bolts (`Projectile.weapon`), sentries and shockwaves; the main gun, rams and burns carry none. `MatchStats.weaponXp` feeds `Profile.weaponXp` in `applyMatch` (local and server). The specials HUD shows each one's level.
- Upgrades vs Arcade: with upgrades on, a tank brings its profile weapon XP into the match (`TankSlot.weaponXp`) and each level adds `weaponDamagePerLevel` (+5%) to that special's damage on tanks and structures. The level counts XP earned so far this match (`weaponLevelIn`), so upgrades land mid-match and still replay bit-identically. The existing `perks` world/lobby flag is the switch, relabelled **Upgrades** (off = **Arcade, fair**): it strips perks and weapon XP. On by default for local matches (incl. Horde), private lobbies and the campaign (P1 via `MissionStart.weaponXp`, recorded in the mission replay); ranked and quick match stay Arcade. Bots and split-screen P2–P4 never have upgrades. Replay loading validates `weaponXp`.
- Tank ranks (Battlefield class style): the existing per-tank mastery (kills in that tank, rank 1–10) now shows in-match and on the profile. `tierFor(track, n)` gives level plus progress to the next tier for both tracks.
- Profile screen: level ring with XP to next level, title picker and Back button in a header, next-level unlocks as chips, then tabs: Overview (career stat tiles incl. win rate and K/D, daily challenges with progress bars, gang chips with unlock levels), Tanks (rank cards with progress, locked tanks show their unlock level), Weapons (crate icon, V-level pips, uses to next), Loadout (perk cards). Results/debrief XP bar now fills from where you started; unlocks show as chips.
- Verified: rules/IP guard, TypeScript, 272 tests in 47 files (new: weapon levels and `tierFor`, `applyMatch` folds weapon XP, `sanitizeProfile` drops junk; a maxed special hits ×1.2 while the main gun, unlevelled specials and Arcade don't; a mine kill names its weapon, pays weapon XP and the level climbs mid-match; the replay-determinism test now runs with upgrades; replay loading rejects bad `weaponXp`; live tally pays per enemy kill and weapon kill, reports level/rank/weapon-ups, ignores self-kills). Headless Chromium: profile at 1280 px and 390 px on every tab; `?quick` with a seeded profile, a real kill and a special raised all three banners.

## S38 — Loadouts: PRO perks, tank-rank upgrades, Oracles, utility upgrades (2026-10-23)
- Utility specials upgrade too: `weaponPower` (renamed `weaponPowerPerLevel`, +5%/level) now scales the health kit's heal, cloak / boost / repair duration and teleport reach, not just damage.
- Tank-rank upgrades (Battlefield class style): `progression.json` `tankUpgrades` — rank 3 Reinforced plating (+5% max HP), 5 Tuned engine (+4% speed), 7 Fast autoloader (+6% fire rate), 10 Veteran crew (−6% damage taken) — for the tank you're driving. The tank brings its per-kind kills in (`TankSlot.mastery`) and counts kills during the match, so a rank-up upgrade lands immediately; the in-match banner names it.
- Perks: each unlocks at a level (`perk:x` keys at 3/5/8/12/15/18; slots still 3/10/20). Every perk has a PRO challenge (`perks.x.pro`: stat, target, extra mods), counted only in matches with it equipped; levels I → II → III → PRO along it (`perkLevel`, `isPro`, `Profile.perkProgress`). PRO adds its bonus on top.
- Oracles (internal "queen", on screen `names.queen`): five companions (`progression.json` `oracles`: Vesper, Ione, Marrow, Sable, Lumen) with a passive that scales with bond 1–5 (20% → 100%) and a gift at bond 3 (a special at the start of every life). Unlocked by campaign missions or lifetime challenges (kills, structures). Bond XP per match with her: +10, +10 for a win, +1 per kill (`bond`). `Profile.oracle` / `Profile.bonds`.
- One mod pipeline: `perkMods(tank)` folds perks, PRO, rank upgrades and the Oracle (scaled by bond), so every system that already read perks picks them up. `loadoutOf(profile, wishes)` builds the slot loadout (trimmed to what's unlocked) for local play, the campaign (`MissionStart.loadout`, recorded in the mission replay) and the server (from its own profile; hello carries the wished `oracle`). Arcade strips all of it in `createWorld`. Full snapshots carry `pros` / `mastery` / `oracle` so client prediction moves the own tank at the server's speed. `applyMatch` reports `pro:x`, `bond:x:n`, `oracle:x`, `upgrade:kind:rank` in `unlocked` for the results screen.
- UI: a shared loadout picker (`app/profile/loadoutPicker.ts`): perk cards with level and PRO progress, Oracle cards with bond, passive strength, gift and unlock progress. In the profile Loadout tab and as a "Loadout" section in the match menu (local matches incl. Horde) and the campaign briefing; changes save to the profile at once. Tanks tab shows upgrade pips and the next upgrade. HUD health uses the real max HP.
- Verified: rules/IP guard, TypeScript, 279 tests in 48 files (new: upgraded health kit heals ×1.2; rank upgrades apply to the driven tank only and land mid-match; PRO bonus and perk levels; Oracle passive at bond 1 vs 5 and gift at bond 3 only; Arcade strips the whole loadout; loadoutOf trims to unlocks; a match advances PRO and bond and reports PRO, bond, Oracle and tank-upgrade unlocks). Headless Chromium: profile Loadout and Tanks tabs, menu Loadout section; `?quick` with a seeded profile gives perks + PRO + Vesper's gift and 154/154 HP, and in Arcade a stock 160/160 tank.

## S39 — Online campaign co-op, Oracles for wingmen (2026-10-23)
- Online campaign co-op: lobby mode **Campaign co-op** (`LobbySettings.mode "campaign"` + `mission`; invite-only, never ranked, upgrades always on). The host picks a mission they've reached in their own campaign (shortcut: trusts the host's local progress), everyone picks an opening tank (`deploy` message, checked against their server profile's level). The server builds the mission (`match/campaignMatch.ts` → `createMissionWorld`): a server-side shared wallet (`coopBucks`: starting bucks + earlier missions' rewards), opening tanks host first (falls back to the cheapest if unaffordable), every player's own loadout from their server profile, names, and the host's wingman Oracles; recorded as a mission replay. Mid-mission redeploys go through `deploy` too (`deployTank` + replay action). Every player gets XP, mission totals, grade XP, PRO and bond progress (server `awardMatch` passes the grade). Snapshots carry the campaign state (minus the mission def), bosses and strikes, so the client's objectives HUD, wallet, boss bar and the shared redeploy prompt (`redeployPrompt`, now in `deployScreen.ts`) work online. The online debrief is the campaign one; a win also advances each player's own local campaign (`recordWin`; the wallet stays theirs).
- `MissionStart` / `MissionSetup` take `loadouts[]` (per human), `allyOracles[]` and `names[]` (replaced the single P1 `loadout`); replay loading validates them.
- Oracles for AI wingmen: `Profile.wingmen` (first wingman first; unlocked, not your own, each once — `wingmenOracles`). Missions with allies give each wingman its Oracle's passive and gift ("Wingman · Ione"); bond XP for a wingman's Oracle counts that wingman's kills (`foldLoadout` looks at the bots led by your tank). Picked in the loadout picker's new Wingmen section (menu, campaign briefing, profile). Local campaign: P1's loadout and wingmen; online: the host's wingmen, each player's own loadout.
- Verified: rules/IP guard, TypeScript, 284 tests in 49 files (new: co-op settings, two players' loadouts + host's wingman Oracles + server wallet, both earn missions and bond; mission replay with loadouts and wingman Oracles plays back exactly; snapshots carry wallet, objectives and pending redeploys; wingman bond on its own kills; replay rejects a bad bond). Live server + two scripted clients: campaign lobby with opening tanks → start → both receive the mission, names and the shared wallet (47 = 65 − 14 − 4). Real browser client joining as guest: co-op lobby, then the mission with objectives and wallet on the HUD. Loadout picker: wingman assignment saves and drops the Oracle riding with you.
