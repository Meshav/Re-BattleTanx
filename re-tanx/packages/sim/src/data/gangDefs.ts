import raw from "../../../../data/gangs.json";
import type { TankKind } from "./tankDefs.ts";
import type { SpecialKind } from "./specialDefs.ts";

export type GangId = keyof typeof raw;
export interface GangDef { name: string; roster: TankKind[]; signature: SpecialKind | "random"; signatureOncePerMatch?: boolean; hidden?: boolean }
export const gangDefs = raw as Record<GangId, GangDef>;
/** Selectable gangs (the hidden one unlocks later, as in the original). */
export const gangIds = (Object.keys(raw) as GangId[]).filter((g) => !(raw as Record<string, GangDef>)[g]!.hidden);
export const allGangIds = Object.keys(raw) as GangId[];
