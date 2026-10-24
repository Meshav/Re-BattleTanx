import type { Vec2 } from "../math/vec2.ts";
import type { TankKind } from "../data/tankDefs.ts";
import type { SpecialKind } from "../data/specialDefs.ts";
import type { GangId } from "../data/gangDefs.ts";
import type { World, TankSlot } from "../world.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { gangDefs } from "../data/gangDefs.ts";
import { randomSpecials, specialDefs } from "../data/specialDefs.ts";
import { pick, shuffled } from "../math/rng.ts";
import { perkMods, type PerkId } from "../progression/perks.ts";
import { oracleDefs, type OracleId } from "../progression/oracles.ts";

export interface Tank {
  id: number; team: number; kind: TankKind; name: string;
  pos: Vec2; rot: number; turretRot: number; speed: number;
  hp: number; cooldown: number;
  alive: boolean; respawnIn: number;
  kills: number; deaths: number;
  gang: GangId | undefined;
  /** this life's order through the gang's five tanks */
  roster: TankKind[]; rosterIndex: number;
  specials: Partial<Record<SpecialKind, number>>;
  selected: SpecialKind | undefined;
  specialCooldown: number;
  shield: number; shieldTime: number;
  /** a once-per-match signature (nuke) has been handed out */
  signatureSpent: boolean;
  /** timed status effects in seconds (burnBy: who set you on fire) */
  fx: TankFx;
  /** laser heat 0..100; overheated = seconds locked out */
  heat: number; overheated: number;
  /** seconds without moving (sentinel deploy) */
  stillFor: number;
  /** hover strafe velocity component */
  slide: number;
  perks: PerkId[];
  /** loadout brought from a profile (undefined / empty = upgrades off: Arcade, bots, guests) — see TankSlot */
  pros?: PerkId[] | undefined;
  weaponXp?: Partial<Record<SpecialKind, number>> | undefined;
  /** kills per tank kind (profile + this match): rank upgrades for the tank being driven */
  mastery?: Partial<Record<TankKind, number>> | undefined;
  oracle?: OracleLink | undefined;
}

export interface OracleLink { id: OracleId; bond: number }

export interface TankFx { burn: number; burnDps: number; burnBy: number; stun: number; cloak: number; boost: number; repair: number }
export const noFx = (): TankFx => ({ burn: 0, burnDps: 0, burnBy: 0, stun: 0, cloak: 0, boost: 0, repair: 0 });

export function newTank(world: World, slot: TankSlot, spawn: Vec2): Tank {
  const gang = slot.gang;
  const roster = gang ? shuffled(world.rng, gangDefs[gang].roster) : [slot.kind ?? "m1"];
  const tank: Tank = {
    id: world.nextId++, team: slot.team, kind: roster[0]!, name: slot.name ?? (gang ? gangDefs[gang].name : roster[0]!),
    pos: { ...spawn }, rot: 0, turretRot: 0, speed: 0, hp: 0, cooldown: 0,
    alive: true, respawnIn: 0, kills: 0, deaths: 0,
    gang, roster, rosterIndex: -1, specials: {}, selected: undefined, specialCooldown: 0,
    shield: 0, shieldTime: 0, signatureSpent: false, fx: noFx(), heat: 0, overheated: 0, stillFor: 0, slide: 0, perks: slot.perks ?? [], pros: slot.pros, weaponXp: slot.weaponXp,
    mastery: slot.mastery && { ...slot.mastery }, oracle: slot.oracle,
  };
  startLife(world, tank);
  return tank;
}

/** Next tank in the roster (reshuffled each lap), full health, gang signature item. */
export function startLife(world: World, tank: Tank): void {
  tank.rosterIndex++;
  if (tank.rosterIndex >= tank.roster.length) {
    tank.roster = shuffled(world.rng, tank.roster);
    tank.rosterIndex = 0;
  }
  tank.kind = tank.roster[tank.rosterIndex]!;
  tank.hp = maxHp(tank);
  tank.speed = tank.cooldown = tank.specialCooldown = tank.shield = tank.shieldTime = 0;
  tank.heat = tank.overheated = tank.stillFor = tank.slide = 0;
  tank.fx = noFx();
  tank.alive = true;
  tank.specials = {};
  tank.selected = undefined;
  giveSignature(world, tank);
  giveGift(tank);
}

/** A close enough bond with your Oracle starts every life with her gift. */
function giveGift(tank: Tank): void {
  const gift = tank.oracle && oracleDefs[tank.oracle.id].gift;
  if (gift && tank.oracle!.bond >= gift.bond) addSpecial(tank, gift.special as SpecialKind, gift.amount);
}

function giveSignature(world: World, tank: Tank): void {
  if (!tank.gang) return;
  const def = gangDefs[tank.gang];
  if (def.signatureOncePerMatch && tank.signatureSpent) return;
  const kind = def.signature === "random" ? pick(world.rng, randomSpecials) : def.signature;
  addSpecial(tank, kind, Math.min(2, specialDefs[kind].max));
  if (def.signatureOncePerMatch) tank.signatureSpent = true;
}

/** Add stock up to the special's cap; selects it if nothing is selected. Returns amount taken. */
export function addSpecial(tank: Tank, kind: SpecialKind, amount: number): number {
  const have = tank.specials[kind] ?? 0;
  const took = Math.max(0, Math.min(amount, specialCap(tank, kind) - have));
  if (took === 0) return 0;
  tank.specials[kind] = have + took;
  tank.selected ??= kind;
  return took;
}

/** Max HP after perks (Scavenger, Oracle's Champion). */
export const maxHp = (t: Pick<Tank, "kind" | "perks">): number => Math.round(tankDefs[t.kind].hp * perkMods(t).maxHp);

/** How many of a special this tank can carry (Quick Loader trims it). */
export const specialCap = (t: Pick<Tank, "perks">, kind: SpecialKind): number => Math.max(1, Math.floor(specialDefs[kind].max * perkMods(t).specialMax));
