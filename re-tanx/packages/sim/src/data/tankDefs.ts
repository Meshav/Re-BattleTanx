import raw from "../../../../data/tanks.json";

export type GunKind = "shell" | "hitscan" | "flame" | "rocket" | "laser" | "mortar";
export interface GunDef {
  kind: GunKind; damage: number; cooldown: number; range: number; speed: number; splash: number;
  /** flame: cone width (deg), burn duration (s) and burn damage per second */
  cone?: number; burn?: number; burnDps?: number;
  /** rocket: homing turn rate (deg/s) and acquisition cone (deg) */
  turnRate?: number; seekCone?: number;
  /** laser: heat per shot, cooling per second; over 100 heat it locks for `overheat` seconds */
  heatPerShot?: number; coolRate?: number; overheat?: number;
  /** mortar: snaps to an enemy within this many degrees of the turret */
  assistCone?: number;
}
export interface TankDef {
  class: string; hp: number; armor: number; radius: number;
  speed: number; reverse: number; accelTime: number; turnRate: number; turretRate: number;
  /** campaign Tank Bucks */
  cost: number;
  gun: GunDef;
  /** strafes and ignores rubble */
  hover?: boolean;
  /** incoming damage multiplier */
  damageTaken?: number;
  /** ram damage multiplier */
  ramFactor?: number;
  /** gun range multiplier after standing still for `deployAfter` seconds */
  deployBonus?: number; deployAfter?: number;
  /** bosses: weak rear vents take this instead of the normal rear multiplier */
  rearMultiplier?: number;
}

export type TankKind = keyof typeof raw;
export const tankDefs = raw as Record<TankKind, TankDef>;
/** Playable tanks (bosses are campaign-only; convoy trucks are driven by the mode). */
export const tankKinds = (Object.keys(raw) as TankKind[]).filter((k) => raw[k].class !== "boss" && raw[k].class !== "convoy");
