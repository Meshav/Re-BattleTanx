import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { TankKind } from "../data/tankDefs.ts";
import type { SpecialKind } from "../data/specialDefs.ts";
import type { Tank } from "../entities/tank.ts";
import { progressionDefs, weaponLevel } from "./levels.ts";

/** Per-tank match counters, fed by events. Plain data on world.stats. */
export interface MatchStats {
  kills: number; deaths: number; structures: number; specials: number; pickups: number; queens: number; damage: number;
  killsByKind: Partial<Record<TankKind, number>>;
  /** per special: progressionDefs.weaponXp for each use and each kill with it */
  weaponXp: Partial<Record<SpecialKind, number>>;
}

export const emptyStats = (): MatchStats => ({ kills: 0, deaths: 0, structures: 0, specials: 0, pickups: 0, queens: 0, damage: 0, killsByKind: {}, weaponXp: {} });

const W = progressionDefs.weaponXp;
const addWeaponXp = (s: MatchStats, k: SpecialKind, n: number) => { s.weaponXp[k] = (s.weaponXp[k] ?? 0) + n; };

/** Weapon level in effect: the XP the tank brought into the match plus what it has earned so far (deterministic, so
 *  upgrades land mid-match on the server and in replays alike). Always 1 with upgrades off (Arcade) and for bots. */
export function weaponLevelIn(world: World, t: Tank, k: SpecialKind): number {
  return t.weaponXp ? weaponLevel((t.weaponXp[k] ?? 0) + (world.stats[t.id]?.weaponXp[k] ?? 0)) : 1;
}

const statsOf = (world: World, id: number): MatchStats => (world.stats[id] ??= emptyStats());

/** Who last hit each structure, so a collapse can be credited. */
export function stepStats(world: World, events: SimEvent[]): void {
  for (const e of events) {
    if (e.type === "kill") {
      statsOf(world, e.victimId).deaths++;
      const killer = world.tanks.find((t) => t.id === e.killerId);
      const victim = world.tanks.find((t) => t.id === e.victimId);
      if (!killer || !victim || killer.team === victim.team) continue;
      const s = statsOf(world, killer.id);
      s.kills++;
      s.killsByKind[killer.kind] = (s.killsByKind[killer.kind] ?? 0) + 1;
      if (e.weapon) addWeaponXp(s, e.weapon, W.kill);
    }
    if (e.type === "hit") statsOf(world, e.sourceId).damage += e.amount;
    if (e.type === "special") {
      const s = statsOf(world, e.tankId);
      s.specials++;
      addWeaponXp(s, e.kind, W.use);
    }
    if (e.type === "pickup") statsOf(world, e.tankId).pickups++;
    if (e.type === "structureStage" && e.stage === 2 && e.by !== undefined) statsOf(world, e.by).structures++;
    if (e.type === "queen" && e.what === "captured") creditQueen(world, e.team);
  }
}

/** Captures are credited to whichever tank on that team was carrying (nearest teammate to the drop-off). */
function creditQueen(world: World, team: number): void {
  const carrier = world.tanks.filter((t) => t.team === team && t.alive)[0];
  if (carrier) statsOf(world, carrier.id).queens++;
}
