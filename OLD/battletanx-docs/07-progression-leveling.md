# 07 — Progression & Leveling (Enhancement)

The originals had no persistent progression. Add a **simple, honest** system that rewards play without breaking PvP.

## 7.1 Principles
1. **Unlock breadth, not height** — levels unlock options (gangs, tanks, cosmetics, perks), not raw stat inflation.
2. **PvP fairness** — perks are sidegrades with tradeoffs; ranked and "Classic" lobbies disable them.
3. **No monetization** — it's a fan project. Nothing for sale.
4. **Everything works for guests** — guests can play all base content; progression just won't save.

## 7.2 Player level (account-wide)
- Levels 1–50. XP curve: `xpToNext(L) = 500 + 150 × L` (L50 ≈ 220k total XP; ~40–60 hours).
- **XP sources**
  | Action | XP |
  |--------|----|
  | Kill | 50 |
  | Assist | 20 |
  | Objective (QueenLord capture, convoy delivery, zone tick) | 100 |
  | Match complete | 150 |
  | Match win | +100 |
  | Campaign mission | 300 + grade bonus (S +300, A +200, B +100) |
  | First win of the day | +500 |
  | Challenges | 200–1000 |
- Bot-only matches give 50% XP (prevents farming).

## 7.3 Unlock track (draft)
| Level | Unlock |
|-------|--------|
| 1 | Iron Hounds, Bone Riders, Atomic Paladins gangs; m1/moto/goliath |
| 3 | Rust Saints gang · first perk slot |
| 5 | Hover tank in MP · Tank Wars mode for quick match |
| 8 | Echo Company · Sentinel tank |
| 10 | Second perk slot · title "Battlelord" |
| 12 | Black Halos |
| 15 | Mad Battalion · emblem editor |
| 20 | Gear Fiends, Faultline · third perk slot |
| 25 | Queen's Guard |
| 30 | Hidden gang (or via cheat code, honoring the original) |
| 35–50 | Cosmetic camo, wreck effects, horns, titles every level |

Campaign progress also unlocks tanks for MP (e.g. finishing Act I unlocks Rhino).

## 7.4 Tank mastery (per tank)
Each tank type has mastery levels 1–10 from using it:
- Rewards are **cosmetic only**: camo patterns, decals, turret trims, kill-counter on the hull, a gold variant at 10.
- Gives players a reason to try every tank without power creep.

## 7.5 Perks (sidegrades)
Up to 3 slots. Each perk has a cost to avoid stacking all upsides.

| Perk | Upside | Downside |
|------|--------|----------|
| Scavenger | Stars give +1 extra special | −10% max HP |
| Reinforced Treads | +20% ram damage, knockback resistant | −5% speed |
| Quick Loader | +12% main gun fire rate | −15% special stack max |
| Field Medic | Health pickups +30% | Shield pickups −30% |
| Ghost Engine | Quieter (AI hearing radius −50%; enemy minimap pings delayed) | −10% armor |
| Demolitionist | +50% damage to structures | −10% damage to tanks |
| Last Stand | At <20% HP, +25% damage | Take +10% damage overall |
| Queen's Champion | +10% speed while carrying a QueenLord | Carrier is pinged every 5 s instead of 8 |

Perks are **off** in Ranked and "Classic" lobbies; host toggle elsewhere.

## 7.6 Challenges
- **Daily** (3): "Destroy 20 structures", "Win a Battlelord match", "Get 5 guided-missile kills". 
- **Weekly** (3): larger versions.
- **Achievements**: one-time (e.g., "Flatten 1,000 buildings", "Win Annihilation without losing a tank", "Nuke 3 tanks at once").

## 7.7 Campaign progression
- Mission stars (grade) and cache collection tracked per mission.
- Bucks carry over between missions within an act.
- Unlocks: Battlelord difficulty after finishing Act II; secret missions after all caches in an act.

## 7.8 Profile
Name, emblem, title, level, favorite gang, stats (kills, K/D, wins by mode, buildings destroyed, QueenLords captured), match history (last 20).

## 7.9 Data (see doc 09 for schema)
Progression stored server-side; client only displays. XP grants are computed from the server's match log at match end.
