import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import { specialDefs, specialKinds, superThreshold, type SpecialKind } from "../data/specialDefs.ts";
import { fireGuided } from "../weapons/guided.ts";
import { fireSwarm } from "../weapons/swarm.ts";
import { dropMine } from "../weapons/mine.ts";
import { plantNuke } from "../weapons/nuke.ts";
import { useHealthKit } from "../weapons/healthKit.ts";
import { fireLaserBlast } from "../weapons/laserBlast.ts";
import { firePlasma } from "../weapons/plasma.ts";
import { placeSentry } from "../weapons/sentry.ts";
import { shockwave } from "../weapons/shockwave.ts";
import { boost, cloak, repair, teleport } from "../weapons/utility.ts";
import { modeRules } from "../modes/registry.ts";

/** Selected special: cycle on demand, fire on cooldown, super shot when stocked past the threshold. */
export function stepSpecials(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  for (const tank of world.tanks) {
    tank.specialCooldown = Math.max(0, tank.specialCooldown - world.dt);
    const input = world.inputs[tank.id];
    if (!tank.alive || !input) continue;
    if (input.cycle && modeRules[world.mode.kind].allowCycle !== false) cycleSpecial(tank, Math.sign(input.cycle));
    if (input.special && tank.specialCooldown <= 0 && tank.selected && tank.fx.stun <= 0) events.push(...useSpecial(world, tank, tank.selected));
  }
  return events;
}

export function cycleSpecial(tank: Tank, dir: number): void {
  const owned = specialKinds.filter((k) => (tank.specials[k] ?? 0) > 0);
  if (!owned.length) return;
  const i = tank.selected ? owned.indexOf(tank.selected) : -1;
  tank.selected = owned[(i + dir + owned.length) % owned.length];
}

function useSpecial(world: World, tank: Tank, kind: SpecialKind): SimEvent[] {
  const have = tank.specials[kind] ?? 0;
  if (have <= 0) return [];
  const threshold = superThreshold(kind);
  const isSuper = threshold !== undefined && have >= threshold;
  const events = fire(world, tank, kind, isSuper, have);
  if (!events.length) return events; // e.g. a guided missile is already in flight
  tank.specialCooldown = specialDefs[kind].cooldown;
  setStock(tank, kind, isSuper ? 0 : have - 1);
  return events;
}

type Use = (w: World, t: Tank, isSuper: boolean, have: number) => SimEvent[];

const uses: Record<SpecialKind, Use> = {
  guided: (w, t, s) => fireGuided(w, t, s),
  swarm: (w, t, s) => fireSwarm(w, t, s),
  mine: (w, t, s, n) => dropMine(w, t, s, n),
  nuke: (w, t) => plantNuke(w, t),
  health: (w, t) => useHealthKit(w, t),
  laser: (w, t, s) => fireLaserBlast(w, t, s),
  plasma: (w, t, s) => firePlasma(w, t, s),
  turret: (w, t) => placeSentry(w, t),
  shock: (w, t) => shockwave(w, t, "shock"),
  edge: (w, t) => shockwave(w, t, "edge"),
  cloak: (w, t) => cloak(w, t),
  speed: (w, t) => boost(w, t),
  teleport: (w, t) => teleport(w, t),
  repair: (w, t) => repair(w, t),
};

const fire = (world: World, tank: Tank, kind: SpecialKind, isSuper: boolean, have: number): SimEvent[] => uses[kind](world, tank, isSuper, have);

function setStock(tank: Tank, kind: SpecialKind, n: number): void {
  if (n > 0) {
    tank.specials[kind] = n;
    return;
  }
  delete tank.specials[kind];
  if (tank.selected !== kind) return;
  tank.selected = undefined;
  cycleSpecial(tank, 1);
}
