# 05 — Multiplayer

## 5.1 Formats
| Format | Players | Notes |
|--------|---------|-------|
| **Local split-screen** | 1–4 on one device | Original experience; gamepads; 2/3/4-way split |
| **Online** | 2–8 (modes cap differently) | Browser via WebSocket/WebRTC; private lobbies + quick match |
| **Hybrid** | Couch + online | Up to 2 local players per browser joining an online lobby |
| **Vs Bots** | Any open slot | Every mode supports AI fill (Original) |

Default team colors: Blue, Red, Green, Yellow (Original). FFA = each player on own team.

## 5.2 Modes
### Original (BattleTanx)
**Deathmatch** — First team to 7 kills (configurable 5–25). Tanks cycle through gang roster randomly on death. Respawn 3 s at the spawn point farthest from enemies.

**Annihilation** — Each player has their gang's 5 tanks as lives; choose which to deploy on each death. Last team with tanks wins. Optional "all 5 on field" variant where you swap control between idle tanks (Original GA-style); idle tanks are AI-controlled in Guard mode.

**Battlelord** — Each team has a fortress with QueenLords (default 3). Steal **all** enemy QueenLords to your fortress to win. Carrying: tank picks up a QueenLord by driving over her; carrier drops her on death. Dropped QueenLords: touched by owner team → instantly return home; untouched 20 s → auto-return. Each base has a **rail-mounted Goliath turret** any defender can hop into (Original).

**Family Mode** — Beginner deathmatch: no special switching (use until empty), Easy control scheme forced, reduced damage, shorter matches (first to 5). Good for kids/new players.

### Original (Global Assault)
**Tank Wars** — 3-minute timed match, most kills wins. Whole squad available; swap tank at any time from a "garage" point.

**Frenzy** — QueenLords spawn at random points (one at a time, or two at 4+ players). Grab and return to your base. First to 10.

**Convoy** — Two teams. Protectors escort 3 AI trucks along a fixed path; Attackers try to destroy them. Trucks stop if no protector is within 25 m. Swap sides for round 2; best total wins.

**Hold 'Em** — One QueenLord on the map. Holding her accrues 1 point/sec; carrier gets marked on radar and moves at −15% speed. First to 120.

### Enhancements (new)
**King of the Rubble** — Rotating control zone; zone moves each 60 s; standing in it scores.

**Last Gang Standing** — Battle-royale-lite for 8 players: map shrinks via "fallout" ring, single life, loot from crates. Shorter, ~8 min.

**Horde** — 1–4 player co-op vs escalating AI waves with boss every 5 waves; spend kill-earned Bucks between waves on tank swaps and turrets.

**Siege** — Asymmetric: attackers have infinite respawn and 10 min to destroy fortress generators; defenders have limited tanks but turrets and repair stations.

## 5.3 Match settings (lobby options)
Kill/score limit · time limit · map · power-ups on/off/ "classic only" · unlimited ammo · friendly fire · bot count and difficulty · gang lock (everyone same gang) · tank restrictions · progression perks on/off (see doc 07) · respawn delay · radar always-on.

## 5.4 Lobby & matchmaking
- **Private lobby**: host creates, shares 6-char code / link. Host controls settings, can kick, fill with bots.
- **Quick match**: pick mode → joins an open public lobby or creates one, backfills with bots until humans arrive; bots leave as humans join.
- **Ranked** *(post-1.0)*: Deathmatch & Battlelord only, Glicko-2 rating, perks disabled.
- Region selection if multiple servers; otherwise single self-hosted server with ping display.
- Guest play without account (name + random tag); account required for progression saves.

## 5.5 Social
- Quick-chat wheel (predefined callouts: "Need backup", "Queen taken!", "Nice shot") — avoids moderating free chat.
- Optional text chat in private lobbies only, with profanity filter.
- Post-match scoreboard: kills, deaths, objective score, damage, MVP badges.
- Rematch vote keeps lobby together.

## 5.6 Anti-cheat basics
- **Server-authoritative** for movement validation, hits, damage, pickups, objectives.
- Clients send inputs, not positions.
- Rate-limit inputs; reject impossible speeds/fire rates.
- Progression XP granted server-side only.

## 5.7 Split-screen specifics
- Up to 4 viewports, each its own camera; shared renderer with scissor/viewport rects.
- Per-viewport HUD scaled down; radar becomes compact.
- Keyboard can host one player; others gamepads.
- Performance target: 60 fps at 2-way on mid laptops; 4-way drops shadow quality automatically.
