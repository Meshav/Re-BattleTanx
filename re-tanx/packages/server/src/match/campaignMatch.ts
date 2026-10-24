import {
  coopBucks, deployCost, isUnlocked, levelFor, loadoutOf, missionById, tankDefs, tankKinds, wingmenOracles,
  type LobbySettings, type MissionSetup, type TankKind,
} from "@re-tanx/sim";
import type { Client } from "../client.ts";

/** A tank this player's server profile has unlocked. */
export const tankOk = (c: Client, kind: TankKind): boolean => isUnlocked(levelFor(c.profile?.xp ?? 0).level, `tank:${kind}`);

const cheapest = tankKinds.filter((k) => isUnlocked(1, `tank:${k}`)).sort((a, b) => tankDefs[a].cost - tankDefs[b].cost)[0]!;

/**
 * Online campaign co-op (lobby mode "campaign"): the server-side wallet (coopBucks), everyone's opening tank — what they
 * picked if unlocked and still affordable, host first, else the cheapest — each player's own loadout from their server
 * profile, and the host's Oracles riding with the wingmen (who follow the host).
 */
export function missionSetupFor(settings: LobbySettings, members: Client[], seed: number): MissionSetup {
  const mission = missionById(settings.mission ?? "")!;
  const bucks = coopBucks(mission.id);
  const diff = { difficulty: settings.difficulty };
  let left = bucks;
  const players = members.map((c) => {
    const kind = c.tank && tankOk(c, c.tank) && deployCost(diff, c.tank) <= left ? c.tank : cheapest;
    left -= deployCost(diff, kind);
    return kind;
  });
  const host = members[0];
  return {
    id: mission.id, players, bucks, difficulty: settings.difficulty, seed, countdown: true, names: members.map((c) => c.name),
    loadouts: members.map((c) => (c.profile ? loadoutOf(c.profile, c.perks, c.oracle) : { perks: [] })),
    allyOracles: host?.profile ? wingmenOracles(host.profile, host.wingmen, host.oracle) : [],
  };
}
