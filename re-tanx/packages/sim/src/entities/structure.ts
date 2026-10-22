import type { StructureKind } from "../data/rules.ts";

/** stage: 0 intact, 1 damaged, 2 rubble (passable, slows). */
export interface Structure { id: number; kind: StructureKind; cx: number; cy: number; hp: number; maxHp: number; stage: number }

export const RUBBLE = 2;

export function stageFor(hp: number, maxHp: number): number {
  if (hp <= 0) return RUBBLE;
  return hp < maxHp / 2 ? 1 : 0;
}
