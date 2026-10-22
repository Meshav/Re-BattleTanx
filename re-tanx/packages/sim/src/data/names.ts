import raw from "../../../../data/names.json";
import type { TankKind } from "./tankDefs.ts";

/** Player-visible names (data/names.json). */
export const names = raw;
export const tankName = (k: TankKind): string => raw.tanks[k];
