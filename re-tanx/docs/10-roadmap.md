# 10 — Roadmap

Each milestone ends with something playable. For the detailed, checklist version, see **doc 11**.

## M0 — Prototype (2–3 weeks)
- Monorepo, Vite + Three.js, shared sim package.
- One medium tank: drive, turret aim, cannon, health, death/respawn.
- Graybox map with destructible blocks (3 stages).
- Arcade + Twin-stick controls; chase camera.
- **Exit test**: is driving and blowing stuff up fun for 5 minutes?

## M1 — Local multiplayer (3–4 weeks)
- Light/Medium/Heavy tanks; 4 specials (guided, swarm, mines, shield); core pickups.
- Gangs (3) with 5-tank rosters and signature items.
- Split-screen 2–4 with gamepads.
- Deathmatch + Annihilation; HUD, kill feed, scoreboard.
- Basic AI: Patrol/Engage/Retreat/Seek Pickup; bot fill.

## M2 — Online (4–6 weeks)
- Authoritative Node server, WebSocket netcode, prediction/interpolation, lag comp.
- Private lobbies with codes; bot backfill.
- Battlelord mode + Fortress Twin map.
- Guest identity.
- **Exit test**: 4 players over the internet at 100 ms feel fine.

## M3 — AI depth + campaign slice (4–6 weeks)
- Full utility brain, archetypes, Squad Director, attack tokens, difficulty levels.
- Grid A* pathfinding that updates when buildings are destroyed.
- Campaign Act I missions 1–4 with Tank Bucks, wingmen, scoring, story stills.
- Co-op campaign (2p).

## M4 — Content & progression (6–8 weeks)
- All 9 tanks, all specials, all gangs.
- Remaining original modes: Family, Tank Wars, Frenzy, Convoy, Hold 'Em.
- 8 MP maps with final art kit.
- Accounts (OAuth/magic link), MariaDB, levels, unlocks, mastery, perks, challenges.
- Quick match.

## M5 — Campaign complete + polish (8+ weeks)
- Acts I & II (24 missions), bosses, secret missions.
- Audio pass, VFX pass, mobile/touch, accessibility (colorblind team palettes, remappable everything, subtitle sizes).
- Performance budgets met.

## 1.0 Launch
- Rename/legal pass complete (doc README).
- Public servers + self-host instructions.

## Post-1.0
- Enhancement modes: King of the Rubble, Last Gang Standing, Horde, Siege.
- Ranked (Glicko-2).
- In-browser map editor + shared maps.
- WebRTC transport, multiple regions.
- Replays/spectator.

## Open questions
1. Final name and original setting rewrite — how close to the BattleTanx story?
2. Art direction: N64-faithful low-poly vs modern stylized?
3. Max online player count per match: 8 or 12?
4. Mobile a launch target or post-launch?
5. Hosting: homelab only, or a VPS for public matches?
