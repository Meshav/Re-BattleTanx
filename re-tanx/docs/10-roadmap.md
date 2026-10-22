# 10 — Roadmap

Each milestone ends with something playable. For the detailed checklist version, see **doc 11**; for what's built right now, **doc 13**.

> **Status (Oct 2026):** M0–M3 done. M4 and M5 done apart from art, extra maps and secret missions. Several post-1.0 items are already built. What stands between here and 1.0 is mostly *art, a real deploy, a real-latency playtest and a final name*.

## M0 — Prototype ✅
- Monorepo, Vite + Three.js, shared sim package.
- Tanks: drive, turret aim, cannon, health, death/respawn.
- Graybox map with destructible blocks (3 stages).
- Arcade + Twin-stick controls; chase camera.

## M1 — Local multiplayer ✅
- Light/Medium/Heavy tanks; specials; core pickups.
- Gangs with 5-tank rosters and signature items.
- Split-screen 2–4 with gamepads.
- Deathmatch + Annihilation; HUD, kill feed, scoreboard.
- AI: Patrol/Engage/Retreat/Seek Pickup; bot fill.

## M2 — Online ✅ (pending a real-latency playtest)
- Authoritative Node server, WebSocket netcode, prediction/interpolation.
- **Lag compensation** for hitscan (S25).
- Private lobbies with codes; bot backfill; **rejoin after disconnect** (S26).
- Oracle Raid (Battlelord) + Fortress map with **rail cannon** (S18).
- Guest identity.
- **Exit test** ⏳: 4 players over the internet at 100 ms feel fine. Needs a live session.

## M3 — AI depth + campaign slice ✅ (core)
- Utility brain, archetypes, attack tokens, difficulty levels, grid A* with destruction.
- Campaign with Scrap (Tank Bucks), wingmen, scoring; 2-player split-screen co-op.
- ⏳ Squad Director tactics (pincer, fallback), story stills, online co-op.

## M4 — Content & progression ✅ (except maps/art)
- All tanks, all specials, all gangs.
- All original modes: Rookie (Family), Tank Wars, Frenzy, **Convoy** (S29), Keep Away (Hold 'Em).
- Accounts (Discord/Google), MariaDB, levels, unlocks, mastery, perks, challenges, **match history** (S27).
- **Quick match** with public, auto-starting lobbies (S28).
- ⏳ 8 MP maps with the final art kit (5 graybox arenas + player-made arenas today; authoring guide in doc 14).

## M5 — Campaign complete + polish ✅ (except art)
- Acts I & II (24 missions), bosses. ⏳ Secret missions.
- Audio pass (procedural placeholder set), mobile/touch, accessibility (colour-blind palette, rebinding, reduced motion).
- ⏳ VFX pass with real art; performance budgets measured on target hardware.

## 1.0 Launch
- Rename/legal pass: ✅ names replaced and guarded by `check-ip`; ⏳ **final game title**.
- Public server + self-host instructions: ✅ Docker Compose + README; ⏳ a live public URL.
- ⏳ MariaDB backups, profanity filter on names, CI.

## Post-1.0
- ✅ Already built: King of the Rubble, Last Gang Standing (rounds), Horde, Siege · Ranked (Glicko-2) + leaderboard · in-browser map editor + shared maps · replays for every match type.
- ⏳ Spectator mode, WebRTC transport, multiple regions, community map rotation, hybrid couch+online.

## Open questions
1. **Final name** — the title is still "Re-Tanx", which echoes "BattleTanx". The docs' working title was "Treadlord".
2. Art direction: N64-faithful low-poly vs modern stylized?
3. Max online player count per match: 8 today. Raise to 12?
4. Mobile: touch works; is it a launch target?
5. Hosting: homelab only, or a VPS for public matches? (Quick match and rejoin assume one server process.)
