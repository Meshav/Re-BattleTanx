import type { World } from "../world.ts";
import type { CampaignState } from "./state.ts";
import { tankDefs, tankKinds, type TankKind } from "../data/tankDefs.ts";
import { campaignDefs } from "./missionDefs.ts";

export function deployCost(c: Pick<CampaignState, "difficulty">, kind: TankKind): number {
  const mul = campaignDefs.difficultyCost[c.difficulty as keyof typeof campaignDefs.difficultyCost] ?? 1;
  return Math.round(tankDefs[kind].cost * mul);
}

export const affordable = (c: CampaignState): TankKind[] => tankKinds.filter((k) => deployCost(c, k) <= c.bucks);

/**
 * Pay for the next tank. Called by the app (deploy screen) — the sim respawns it after the usual delay.
 * Returns false if the player can't afford it.
 */
export function deployTank(world: World, tankId: number, kind: TankKind): boolean {
  const c = world.campaign;
  const tank = world.tanks.find((t) => t.id === tankId);
  if (!c || !tank || tank.alive || c.pendingDeploy[tankId] || deployCost(c, kind) > c.bucks) return false;
  c.bucks -= deployCost(c, kind);
  c.pendingDeploy[tankId] = kind;
  tank.roster = [kind];
  tank.rosterIndex = -1;
  return true;
}
