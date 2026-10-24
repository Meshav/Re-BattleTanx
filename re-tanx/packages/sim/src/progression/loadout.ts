import type { Tank } from "../entities/tank.ts";
import type { TankSlot, World } from "../world.ts";
import type { Profile } from "./profile.ts";
import type { ChallengeStat } from "./challenges.ts";
import { tankKinds } from "../data/tankDefs.ts";
import { isPro, legalPerks, perkDefs } from "./perks.ts";
import { bondFor, bondXp, legalOracle, oracleIds, oracleUnlocked } from "./oracles.ts";
import { masteryLevel, progressionDefs } from "./levels.ts";

export type Loadout = Pick<TankSlot, "perks" | "pros" | "weaponXp" | "mastery" | "oracle">;

/** What a profile brings into a match with upgrades on (createWorld strips it for Arcade). Built from the profile on the
 *  server and locally, never from what a client claims: `perks` / `oracle` are only wishes, trimmed to what it has unlocked. */
export function loadoutOf(p: Profile, perks: unknown = p.perks, oracle: unknown = p.oracle): Loadout {
  const ps = legalPerks(p, perks), o = legalOracle(p, oracle);
  return {
    perks: ps, pros: ps.filter((id) => isPro(p, id)), weaponXp: { ...p.weaponXp }, mastery: { ...p.masteryKills },
    ...(o ? { oracle: { id: o, bond: bondFor(p.bonds[o] ?? 0).level } } : {}),
  };
}

/**
 * After a match (`p` already has its totals and mastery): PRO progress for the perks that were equipped, bond XP with the
 * Oracle that rode with you and those riding with your wingmen (each on its own kills), and what that unlocked —
 * `pro:x`, `bond:x:n`, `oracle:x`, `upgrade:kind:rank` — for the results screen.
 */
export function foldLoadout(prev: Profile, p: Profile, world: World, tank: Tank | undefined, gains: Partial<Record<ChallengeStat, number>>): string[] {
  const out: string[] = [];
  for (const id of tank?.perks ?? []) {
    const was = isPro(p, id);
    p.perkProgress[id] = (p.perkProgress[id] ?? 0) + (gains[perkDefs[id].pro.stat as ChallengeStat] ?? 0);
    if (!was && isPro(p, id)) out.push(`pro:${id}`);
  }
  const wingmen = world.tanks.filter((t) => tank && world.bots[t.id]?.leaderId === tank.id);
  for (const t of tank ? [tank, ...wingmen] : []) {
    const o = t.oracle;
    if (!o) continue;
    const before = bondFor(p.bonds[o.id] ?? 0).level;
    p.bonds[o.id] = (p.bonds[o.id] ?? 0) + bondXp.match + (gains.wins ?? 0) * bondXp.win + (t === tank ? gains.kills ?? 0 : t.kills) * bondXp.kill;
    const after = bondFor(p.bonds[o.id]!).level;
    if (after > before) out.push(`bond:${o.id}:${after}`);
  }
  for (const id of oracleIds) if (!oracleUnlocked(prev, id) && oracleUnlocked(p, id)) out.push(`oracle:${id}`);
  for (const k of tankKinds) {
    const a = masteryLevel(prev.masteryKills[k] ?? 0), b = masteryLevel(p.masteryKills[k] ?? 0);
    for (const u of progressionDefs.tankUpgrades) if (a < u.rank && u.rank <= b) out.push(`upgrade:${k}:${u.rank}`);
  }
  return out;
}
