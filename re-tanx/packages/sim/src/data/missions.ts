import act1 from "../../../../data/campaign/act1.json";
import act2 from "../../../../data/campaign/act2.json";
import { campaignDefs, type MissionDef } from "../campaign/missionDefs.ts";

/** Campaign missions in play order. */
export const campaignMissions = [...act1.missions, ...act2.missions] as unknown as MissionDef[];
export const missionById = (id: string): MissionDef | undefined => campaignMissions.find((m) => m.id === id);

/** Shared wallet for an online co-op mission: starting bucks plus every earlier mission's reward (the server never sees anyone's local campaign). */
export function coopBucks(id: string): number {
  const i = Math.max(0, campaignMissions.findIndex((m) => m.id === id));
  return campaignDefs.startBucks + campaignMissions.slice(0, i).reduce((n, m) => n + m.reward, 0);
}
