import raw from "../../../../data/rules.json";

export type StructureKind = keyof typeof raw.structures;
export const rules = raw;
