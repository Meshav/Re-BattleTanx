import { gangDefs, names, oracleDefs, perkDefs, perkSlots, progressionDefs, type GangId, type OracleId, type PerkId } from "@re-tanx/sim";
import { tankName, type TankKind } from "@re-tanx/sim";

/** "gang:boneRiders" → "Bone Riders gang"; also perks, PRO, Oracles, bonds and tank-rank upgrades (see foldLoadout). */
export function unlockLabel(key: string): string {
  const [kind, id = "", n = ""] = key.split(":");
  if (kind === "perk") return `${perkDefs[id as PerkId]?.name ?? id} perk`;
  if (kind === "pro") return `${perkDefs[id as PerkId]?.name ?? id} PRO`;
  if (kind === "oracle") return `${names.queen.one} ${oracleDefs[id as OracleId]?.name ?? id}`;
  if (kind === "bond") return `Bond ${n} with ${oracleDefs[id as OracleId]?.name ?? id}`;
  if (kind === "upgrade") return `${tankName(id as TankKind)}: ${progressionDefs.tankUpgrades.find((u) => String(u.rank) === n)?.name ?? `rank ${n}`}`;
  if (kind === "gang") return `${gangDefs[id as GangId]?.name ?? id} gang`;
  if (kind === "tank") return `${tankName(id as TankKind)} tank`;
  if (kind === "title") return `title “${id}”`;
  if (kind === "perkSlot") return "perk slot";
  return key;
}

export const slotsLabel = (level: number): string => `${perkSlots(level)} perk slot${perkSlots(level) === 1 ? "" : "s"}`;
