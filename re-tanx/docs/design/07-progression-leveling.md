# 07 — Progression & Leveling (Enhancement)

> **Status (Oct 2026, S29):** levels, the unlock track, mastery, perks, challenges, ranked ratings and match history are built. The live numbers are in `data/progression.json`. On-screen names follow `data/names.json` (Oracle, Oracle Raid, Scrap…).

The originals had no persistent progression. Add a **simple, honest** system that rewards play without breaking PvP.

## 7.1 Principles
1. **Unlock breadth, not height** — levels unlock options (gangs, tanks, cosmetics, perks), not raw stat inflation.
2. **PvP fairness** — perks are sidegrades with trade-offs; ranked and "Classic" lobbies disable them. ✅ (ranked forces perks off server-side)
3. **No monetization** — it's a fan project. Nothing for sale.
4. **Everything works for guests** — ✅ guests have a signed token and a server profile; signing in with Discord/Google keeps it and makes it follow you across devices.

## 7.2 Player level (account-wide) ✅
- Levels 1–50. XP curve: `xpToNext(L) = 500 + 150 × L` (L50 ≈ 220k total XP; ~40–60 hours).
- **XP sources** (design values; live values in `data/progression.json → xp`)

  | Action | XP |
  |--------|----|
  | Kill | 50 |
  | Assist ⏳ | — (assists aren't tracked) |
  | Objective (Oracle capture; each campaign objective done) | 100 |
  | Match complete | 150 |
  | Match win | +100 |
  | Campaign mission (won) | 300 + grade bonus (S +300, A +200, B +100) |
  | First win of the day | +500 |
  | Challenges | 200–600 (`data/progression.json → challenges.pool`) |

- Bot-only matches give 50% XP (prevents farming).
- Online: the server computes XP from the authoritative world. A player who leaves early earns no XP (but is still rated in ranked, §7.10).

## 7.3 Unlock track ✅ (as in `data/progression.json`)
| Level | Unlock |
|-------|--------|
| 1 | Iron Hounds, Bone Riders, Atomic Paladins · Ranger (m1), Scout (moto), Behemoth (goliath) |
| 3 | Rust Saints · first perk slot |
| 5 | Skimmer (hover) · Faultline |
| 8 | Echo Company · Howitzer (sentinel) · Viper (rattler) |
| 10 | Second perk slot · title "Oracle Raid" · Torch (inferno) |
| 12 | Black Halos · Lancer (flpe) |
| 15 | Mad Battalion |
| 18 | Ram (rhino) |
| 20 | Gear Fiends · third perk slot |
| 25 | Queen's Guard · title "Warlord" |
| 30 | Hidden gang Riftborn · title "Riftborn" |
| 40 / 50 | Titles "Tank Saint" / "Legend of the Long Road" |

The server enforces gang and perk unlocks: a client can't pick something its profile hasn't unlocked.

## 7.4 Tank mastery (per tank) ✅
Mastery levels from kills with each tank. Rewards are **cosmetic only** (shown on the profile screen). ⏳ The cosmetic items themselves (camo, decals) wait for the art pass.

## 7.5 Perks (sidegrades) ✅
Up to 3 slots. Each perk has a cost so you can't stack every upside.

| Perk | Upside | Downside |
|------|--------|----------|
| Scavenger | Stars give +1 extra special | −10% max HP |
| Reinforced Treads | +20% ram damage | −5% speed |
| Quick Loader | +12% main gun fire rate | −15% special stack max |
| Field Medic | Health pickups +30% | Shield pickups −30% |
| Ghost Engine | Quieter (AI hearing −50%) | −10% armor |
| Demolitionist | +50% damage to structures | −10% damage to tanks |
| Last Stand | At <20% HP, +25% damage | Take +10% damage overall |
| Oracle's Champion | +10% speed while carrying an Oracle | −5% max HP |

Perks are **off** in Ranked and "Classic" lobbies; a host toggle elsewhere. Ghost Engine's upside shows on screen as "Bots hear you at half range".

## 7.6 Challenges ✅
- **Daily** (3): the same set for everyone each UTC day, picked from a pool of 8 by a seeded rotation and advanced by match stats (kills, structures, matches, wins, Oracles, specials, pickups, missions).
- ⏳ **Weekly** challenges and one-time **Achievements**.

## 7.7 Campaign progression ✅
- Best grade per mission. Scrap (Tank Bucks) carries between missions. 24 missions across two acts unlock in order.
- ⏳ Battlelord difficulty unlock, secret missions, server-side campaign saves (progress lives in the browser today).

## 7.8 Profile
- ✅ Local profile screen: level, XP, perks, mastery, totals (kills, deaths, matches, wins, structures, Oracles, missions).
- ✅ **Online match history (last 20)** — online menu → "Match history": when, mode (★ ranked), arena, place, K/D, XP, rating change. Served by `GET /history` (your token only).
- ⏳ Emblem editor, favourite gang, wins-by-mode breakdown.

## 7.9 Data (see doc 09 §9.6 for schema)
Progression is stored server-side for online play: the whole `Profile` as a JSON column in `players`, updated atomically. Every online match also writes `matches` + `match_players` rows. The client only displays.

## 7.10 Ranked rating ✅ *(Enhancement)*
- **Glicko-2** (`sim/progression/glicko.ts`, checked against Glickman's worked example). Start 1500 / RD 350 / σ 0.06.
- One ranked match is one rating period. FFA finishing order (team score, then kills) becomes pairwise wins, draws and losses against each opponent's pre-match rating.
- Quitters are placed last.
- The leaderboard and results show the **conservative rating** r − 2·RD, so new players start low and climb as their RD shrinks.
- Ranked lobbies are humans-only FFA, perks off, in placement modes (doc 05 §5.4).
