import raw from "../../../../data/specials.json";

export type SpecialKind = keyof typeof raw;
export const specialDefs = raw;
export const specialKinds = Object.keys(raw) as SpecialKind[];
/** Specials that can show up as a random gang signature or a '*' pickup. */
export const randomSpecials: SpecialKind[] = ["guided", "swarm", "mine", "laser", "plasma", "speed"];

export function superThreshold(kind: SpecialKind): number | undefined {
  const def = specialDefs[kind];
  return "super" in def ? def.super.threshold : undefined;
}
