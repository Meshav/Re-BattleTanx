import { gangIds, type Difficulty, type GangId, type ModeKind, type PerkId, type TankSlot } from "@re-tanx/sim";

export type Device = "kbm" | "keys" | "touch" | "pad0" | "pad1" | "pad2" | "pad3";
export type Teams = "ffa" | "coop";

export interface LocalPlayerCfg { gang: GangId; device: Device }

export interface MatchConfig {
  mode: ModeKind; scoreLimit: number; teams: Teams;
  players: LocalPlayerCfg[]; bots: number; difficulty: Difficulty;
  /** P1's profile perk loadout applies (off = Classic) */
  perks?: boolean;
  map?: string;
}

export const DEVICE_LABEL: Record<Device, string> = {
  kbm: "Keyboard + mouse", keys: "Arrow keys", touch: "Touch screen", pad0: "Gamepad 1", pad1: "Gamepad 2", pad2: "Gamepad 3", pad3: "Gamepad 4",
};

export const defaultConfig = (): MatchConfig => ({
  mode: "deathmatch", scoreLimit: 7, teams: "ffa",
  players: [{ gang: "ironHounds", device: isTouchDevice() ? "touch" : "kbm" }], bots: 3, difficulty: "normal",
});

/** Humans first (so their tank ids are known), then bots on rotating gangs. */
export function toSlots(cfg: MatchConfig, p1Perks: PerkId[] = []): TankSlot[] {
  const humans: TankSlot[] = cfg.players.map((p, i) => ({ team: cfg.teams === "ffa" ? i : 0, gang: p.gang, name: `P${i + 1}`, ...(i === 0 ? { perks: p1Perks } : {}) }));
  const bots: TankSlot[] = Array.from({ length: cfg.bots }, (_, i) => ({
    team: cfg.teams === "ffa" ? cfg.players.length + i : 1,
    gang: gangIds[(i + cfg.players.length) % gangIds.length]!,
    bot: cfg.difficulty,
  }));
  return [...humans, ...bots];
}

/** Phones and tablets get the on-screen sticks by default. */
export const isTouchDevice = (): boolean => typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
