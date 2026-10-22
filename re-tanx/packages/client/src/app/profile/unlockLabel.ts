import { gangDefs, perkSlots, type GangId } from "@re-tanx/sim";
import { tankName, type TankKind } from "@re-tanx/sim";

/** "gang:boneRiders" → "Bone Riders gang". */
export function unlockLabel(key: string): string {
  const [kind, id = ""] = key.split(":");
  if (kind === "gang") return `${gangDefs[id as GangId]?.name ?? id} gang`;
  if (kind === "tank") return `${tankName(id as TankKind)} tank`;
  if (kind === "title") return `title “${id}”`;
  if (kind === "perkSlot") return "perk slot";
  return key;
}

export const slotsLabel = (level: number): string => `${perkSlots(level)} perk slot${perkSlots(level) === 1 ? "" : "s"}`;
