# 05 — Multiplayer

> **Status (Oct 2026, through S29):** everything in this doc marked ✅ is built and tested in the repo. Player-facing names follow `data/names.json` (README legal note): QueenLord → **Oracle**, Battlelord → **Oracle Raid**, Family → **Rookie**, Hold 'Em → **Keep Away**, rail Goliath → **rail cannon**. This doc keeps the original names as design references.

## 5.1 Formats
| Format | Players | Status | Notes |
|--------|---------|--------|-------|
| **Local split-screen** | 1–4 on one device | ✅ | Keyboard+mouse, arrow keys, up to 4 gamepads, touch; 2/3/4-way split |
| **Online** | 2–8 humans (+ bots) | ✅ | Browser via WebSocket; private lobbies, quick match, ranked |
| **Hybrid** | Couch + online | ⏳ | Up to 2 local players per browser joining an online lobby (not built) |
| **Vs Bots** | Any open slot | ✅ | Every mode supports AI fill (Original) |

Default team colours: Blue, Red, Green, Yellow (Original), with an Okabe–Ito colour-blind palette option. FFA = each player on their own team.

## 5.2 Modes
### Original (BattleTanx)
**Deathmatch** ✅ — First team to 7 kills (configurable). Tanks cycle through the gang roster on death. Respawn at the spawn point farthest from enemies.

**Annihilation** ✅ — Each player has their gang's 5 tanks as lives. Last team with a tank wins. *(Not built: the "all 5 on field" variant.)*

**Battlelord / Oracle Raid** ✅ — Each team has a fortress with 3 Oracles (QueenLords). Steal **all** enemy Oracles to your fortress to win. A tank picks one up by driving over her; the carrier drops her on death. Dropped: touched by her own team → home instantly; untouched 20 s → auto-return. Captives in an enemy fortress can be rescued.
- **Rail cannon** ✅ (rail Goliath, Original): each fortress gets a straight track on the row beside it. Park a team tank on it for 0.8 s to man it. While riding, the hull is locked to the track, W/S slides it, and the turret aims freely. You fire a heavy shell (55 dmg, splash 3, range 85) and take ×0.6 damage. Hold a hard turn 0.5 s to hop off. Carriers can't mount; enemies can't use your rail. Defend-role bots man it.

**Family Mode / Rookie** ✅ — Beginner deathmatch: specials can't be switched (use until empty), ×0.6 damage, first to 5. *(Not built: forcing the Easy control scheme.)*

### Original (Global Assault)
**Tank Wars** ✅ — 3-minute timed match, most kills wins. *(Not built: the "garage" swap point.)*

**Frenzy** ✅ — Oracles spawn at random points; grab and return to your base. First to 10.

**Convoy** ✅ *(S29)* — Two teams; round 1 team 0 protects, round 2 sides swap.
- Protectors escort **3 AI trucks** along a road the server plans with A* from their fortress to the enemy fortress. Attackers destroy them.
- A truck only rolls with a protector **within 25 m**, keeps ~12 m to the truck ahead, and backs off and turns if shoved into a wall.
- A truck reaching the far fortress is **delivered (+1)**. A round ends when no trucks remain or after **150 s**.
- Round 2 respawns everyone and reverses the road. Most deliveries over both rounds wins; a tie is a draw.
- Trucks are tank entities (kind `truck`, 260 HP, no gun), so every weapon, AI, snapshot and replay path handles them. They never respawn, don't take pickups, and are left off the results table.
- Tunables: `data/modes.json → convoy`.

**Hold 'Em / Keep Away** ✅ — One Oracle on the map. Holding her scores 1 point/s; the carrier is slowed (×0.85). First to 60.

### Enhancements (new)
**King of the Rubble** ✅ — A control zone moves every 60 s; only a team alone in it scores.

**Last Gang Standing** ✅ *(as built: rounds)* — One life per round; the last team alive takes the round; first to 3 rounds. *(Not built: the battle-royale shrinking "fallout" ring and crate loot from the original design.)*

**Horde** ✅ — 1–4 player co-op against escalating waves, a boss every 5 waves, budget formula in doc 06 §6.9. *(Not built: spending Bucks between waves.)*

**Siege** ✅ *(as built)* — Always two teams. Defenders guard a 2500 HP core on their fortress for 4 minutes; attackers have infinite respawns and win if the core falls. *(Not built: multiple generators, limited defender tanks, repair stations.)*

## 5.3 Match settings (lobby options)
Built ✅: map (5 arenas + player-made arenas), mode, score limit (0 = mode default), bot count (0–7) and difficulty, teams (FFA / humans vs bots), upgrades on/off (off = "Arcade": no perks or weapon levels), **Ranked**, **Public**.
Not built ⏳: time-limit override, power-up rules, unlimited ammo, friendly fire, gang lock, tank restrictions, respawn delay, radar always-on.

## 5.4 Lobby & matchmaking
- **Private lobby** ✅ — host creates; share a **5-letter code** or an invite link (`?join=CODE`). The host controls settings and starts. Not built: kick.
- **Quick match** ✅ *(S28)* — one button: join the **fullest open public lobby** that hasn't started, or open a new one (casual deathmatch, 3 bots). Never drops you into a private lobby or a running match.
  - **Public lobbies** start by themselves: **30 s** for a lone player (bots fill in), **15 s** once 2+ humans are there, **3 s** when full (8). A new player can only bring the start forward. Lobby messages carry `startsIn` and the screen counts down.
  - After a match a public lobby rolls into the next countdown. Ranked public lobbies wait for a second player. The host can tick/untick "Public" or start early.
  - *Not built:* bots leaving as humans join mid-match; mode choice before quick match.
- **Ranked** ✅ *(S22)* — a lobby checkbox. Humans-only FFA, perks off, in a mode with a clear finishing order (Deathmatch, Tank Wars, Last Gang Standing, Annihilation). Needs 2+ players.
  - **Glicko-2**: one match = one rating period; FFA finishing order becomes pairwise results. Quitters are rated last.
  - The leaderboard shows the conservative rating r − 2·RD (`GET /leaderboard`).
- **Rejoin after a disconnect** ✅ *(S26)* — a dropped connection (not "Leave match") keeps the seat for **60 s** while a bot drives the tank. A match with nobody left keeps running for that long too.
  - The same player (by the profile id behind the signed token, never by name) sends `{t:"rejoin", code}` and gets the tank back with a full snapshot.
  - The client retries automatically every 2 s. After a reload or crash, the online menu offers "Rejoin your match" for 15 minutes; the server decides if the seat is still there.
- **Match history** ✅ *(S27)* — every online match is stored (MariaDB `matches` + `match_players`, or `matches.jsonl` with the file store). "Match history" in the online menu shows your last 20: mode, arena, place, K/D, XP, rating change. `GET /history` only returns the token holder's own matches.
- **Identity** ✅ — guest play with a signed token. Optional Discord/Google sign-in links the guest so progress follows you to any device.
- Not built ⏳: region selection, ping-based server choice (one self-hosted server; ping shown in-match).

## 5.5 Social
- Post-match scoreboard ✅: kills, deaths, gang; XP and rating panel online; replay watch/save.
- Not built ⏳: quick-chat wheel, lobby text chat, MVP badges, rematch vote (public lobbies auto-rematch instead).

## 5.6 Anti-cheat basics
- **Server-authoritative** ✅ for movement, hits, damage, pickups, objectives, XP, ratings and history.
- Clients send **inputs, not positions** ✅. Every message passes one parser that clamps or rejects it (`sim/net/validate.ts`). Inputs are quantized there, so server matches replay exactly.
- **Rate limits** ✅: 90 inputs/s and 20 other messages/s per connection; 4 KB max message; 500 lobbies per server.
- **Unlocks enforced server-side** ✅: gangs and perks are trimmed to what the profile has unlocked.
- **Lag compensation can't be abused** ✅: a shooter's claimed view tick is clamped to 250 ms; bots and seats taken over by bots always shoot in the present (doc 09 §9.4).
- Player-made arenas are re-validated by the server before use (`checkMap`).

## 5.7 Split-screen specifics
- ✅ Up to 4 viewports, each with its own camera (chase / cockpit / top-down); shared renderer with scissor rects.
- ✅ Per-viewport HUD; one keyboard+mouse, one arrow-key player, gamepads for the rest.
- ⏳ Automatic shadow-quality drop at 4-way (a manual "Low" graphics setting exists).
