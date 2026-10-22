import act1 from "../../../../data/campaign/act1.json";
import act2 from "../../../../data/campaign/act2.json";
import type { MissionDef } from "../campaign/missionDefs.ts";

/** Campaign missions in play order. */
export const campaignMissions = [...act1.missions, ...act2.missions] as unknown as MissionDef[];
export const missionById = (id: string): MissionDef | undefined => campaignMissions.find((m) => m.id === id);
