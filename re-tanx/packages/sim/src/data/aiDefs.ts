import raw from "../../../../data/ai.json";
import type { TankKind } from "./tankDefs.ts";

export type Difficulty = keyof typeof raw.difficulty;
export type Archetype = keyof typeof raw.archetypes;
export const aiDefs = raw;
export const difficulties = Object.keys(raw.difficulty) as Difficulty[];
export const archetypeFor = (kind: TankKind): Archetype => raw.archetypeByTank[kind] as Archetype;
