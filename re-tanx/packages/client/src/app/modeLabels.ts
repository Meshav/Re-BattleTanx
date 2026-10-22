import type { ModeKind } from "@re-tanx/sim";
import { names } from "@re-tanx/sim";

export const MODE_LABEL: Record<ModeKind, string> = {
  deathmatch: "Deathmatch — first to the kill limit",
  annihilation: "Annihilation — five tanks each, last team with a tank wins",
  tankWars: "Tank Wars — three minutes, most kills",
  family: `${names.modes.family} — short, gentle deathmatch`,
  battlelord: `${names.modes.battlelord} — steal every enemy ${names.queen.one}`,
  frenzy: `Frenzy — race the ${names.queen.one} home`,
  holdEm: `${names.modes.holdEm} — keep the ${names.queen.one} longest`,
  koth: "King of the Rubble — hold the moving zone",
  horde: "Horde — co-op against endless waves",
  lastGang: "Last Gang Standing — one life per round, first to 3 rounds",
  siege: "Siege — defenders hold the core for four minutes",
  convoy: "Convoy — escort three trucks across, then stop theirs",
  campaign: "Campaign",
};

export const MODE_SHORT: Record<ModeKind, string> = {
  deathmatch: "Deathmatch", annihilation: "Annihilation", tankWars: "Tank Wars", family: names.modes.family,
  battlelord: names.modes.battlelord, frenzy: "Frenzy", holdEm: names.modes.holdEm, koth: "King of the Rubble", horde: "Horde", lastGang: "Last Gang Standing", siege: "Siege", convoy: "Convoy", campaign: "Campaign",
};
