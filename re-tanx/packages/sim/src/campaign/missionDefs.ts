import type { MapJson } from "../data/map.ts";
import type { TankKind } from "../data/tankDefs.ts";
import type { Difficulty } from "../data/aiDefs.ts";
import raw from "../../../../data/campaign/rules.json";

export type ObjectiveKind = "destroyAll" | "destroyTargets" | "reach" | "rescue" | "survive" | "noDeaths" | "parTime" | "caches" | "stopRunners" | "destroyTurrets";

export interface ObjectiveDef { kind: ObjectiveKind; label: string; optional?: boolean; seconds?: number }

/** When a wave arrives: at mission start, after N seconds, or once an earlier wave is wiped out. */
export type WaveTrigger = "start" | { after: number } | { cleared: number } | { reached: true } | { targetsDown: true } | { decoy: true };

/** boss: the first tank is a phased boss. runner: these tanks flee for an 'O' exit. */
export interface WaveDef { trigger: WaveTrigger; tanks: TankKind[]; difficulty?: Difficulty; boss?: boolean; runner?: boolean }

export interface MissionDef {
  id: string; act: number; title: string; location: string;
  brief: string[]; debrief: string;
  map: MapJson;
  allies: TankKind[];
  waves: WaveDef[];
  objectives: ObjectiveDef[];
  reward: number;
  /** 0..1: how thick the fog is (London) */
  fog?: number;
  /** indexes into the map's captives that are decoys (touching one springs the {decoy} waves) */
  decoys?: number[];
}

export const campaignDefs = raw;
