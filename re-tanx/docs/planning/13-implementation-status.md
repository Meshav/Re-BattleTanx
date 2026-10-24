# 13 — Implementation Status (as of S35, 23 Oct 2026)

What the repo does today, measured against docs 01–12 and 14. Per-section detail is in the repo's `CHANGES_LOG.md` (S01–S32).

## Built and tested (268 automated tests in 46 files, run 23 Oct 2026, + headless-browser checks per feature)
| Area | Status |
|------|--------|
| Core sim | Deterministic 30 Hz sim. All tanks, guns, specials, pickups, destruction, rubble, water/hover |
| Modes | Deathmatch, Annihilation, Tank Wars, Rookie (Family), Oracle Raid (Battlelord) with rail cannon, Frenzy, **Convoy**, Keep Away (Hold 'Em), King of the Rubble, Horde, Last Gang Standing, Siege |
| AI | Utility brain, perception, archetypes, attack tokens, A*, special-use rules, objective goals for every mode (incl. rail cannon and Convoy escort/ambush), wingmen, bosses |
| Campaign | Acts I + II (24 missions), Scrap economy, deploys, waves, decoys, runners, turrets, mines, fog, 3-phase bosses. Every mission tested for drivability and completion |
| Local play | 1–4 split-screen; keyboard/mouse, gamepads, touch; chase / cockpit / top-down cameras |
| Online | Authoritative server, prediction/interpolation, **hitscan lag compensation**, private lobbies, **quick match + public auto-start lobbies**, **rejoin after disconnect**, ranked (Glicko-2) + leaderboard, custom arenas |
| Progression | XP, levels, unlocks, perks, mastery, challenges; server-side online, plus **match history** |
| Accounts & storage | Guest tokens; Discord/Google sign-in links the guest; MariaDB with idempotent migrations (file store fallback) |
| Replays | Local, campaign and online (server-recorded, incl. lag comp, dropouts and rejoins). Bit-identical re-simulation |
| Map editor | In-browser, validated, share codes and links, usable in local and online lobbies. Authoring guide + starter template: doc 14 |
| Audio | 42 original procedural SFX + 2 music loops, positional/stereo, manifest-tuned |
| Match start | 3 s count-in (title, 3-2-1, GO!) in local, campaign and online matches; replays carry it |
| Deploy | Dockerfile (server + Caddy web) + compose with MariaDB; built and run end-to-end on stand-in base images; `scripts/smoke-match.mjs` post-deploy check |
| Legal | Original names replaced via `data/names.json`; `check-ip` guard in `npm run check` |

## What S25–S32 added
| Section | Feature | Key facts |
|---------|---------|-----------|
| S25 | Hitscan lag compensation | 8-tick (250 ms) rewind; client sends `view` tick; clamped; bots shoot in the present; replay-safe |
| S26 | Rejoin after disconnect | 60 s grace with a bot driving; same token reclaims the tank; auto-retry in page; "Rejoin" after reload (15 min offer) |
| S27 | Match history | MariaDB `matches` + `match_players` (new columns via `ADD COLUMN IF NOT EXISTS`); `GET /history` (Bearer token, own matches only); menu view |
| S28 | Quick match | Fullest open public lobby or a new one; auto-start 30 s alone / 15 s with company / 3 s full; ranked waits for 2 |
| S29 | Convoy | 3 trucks (tank kind `truck`) on an A* road; roll only with a protector within 25 m; 150 s rounds, sides swap, most deliveries wins; bot escort/ambush roles |
| S30 | Docs | Docs 05–13 rewritten against the code |
| S31 | Map authoring | Doc 14 map authoring guide + "Starter Yard" template; docs shipped in the repo under `docs/` |
| S32 | Docs reorganised | `docs/` split into `design/`, `engineering/`, `planning/`, `guides/`; docs 02/03/04/07 checked against the data files; self-hosting guide; READMEs rewritten |

## What S35 added
| Section | Feature | Key facts |
|---------|---------|-----------|
| S35 | Decomp pass + count-in | Doc 15 records the original's countdown, unit/weapon/pickup numbers, destructibles and levels from the N64 decompilation (no assets in it; none shipped). Pre-match count-in built from it |

## Open items
- **From the decomp (doc 15 §15.8):** Grenades, Smokescreen and Gun Buddies specials; radar pickup; breakable props with ram-to-crush and explosive barrels; rebuilding fortress guns in Battlelord; squad orders (attack / charge / retreat); lobby toggles for power-ups, power-up regen and friendly fire; battle music starting at GO.
- **Pick a final game title** (still "Re-Tanx") in `data/names.json` + `index.html`.
- **Real-world checks**: a live Discord/Google sign-in, one `docker compose build` with Docker Hub access, and a playtest at real latency (lag comp and rejoin were tested on localhost).
- Not built yet: wingman command wheel, Squad Director tactics (pincer/fallback), Trickster/Kamikaze AI, spectator mode, hybrid couch+online, online co-op campaign, secret missions, 3 more arenas and the art kit, CI, MariaDB backups, profanity filter, dev network simulator.
