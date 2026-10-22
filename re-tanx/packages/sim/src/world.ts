import type { ConvoyState } from "./modes/convoy.ts";
import type { LagComp } from "./systems/lagComp.ts";
import type { Rail } from "./entities/rail.ts";
import type { GameMap } from "./data/map.ts";
import { rules } from "./data/rules.ts";
import type { TankKind } from "./data/tankDefs.ts";
import type { GangId } from "./data/gangDefs.ts";
import { newTank, type Tank } from "./entities/tank.ts";
import type { Projectile } from "./entities/projectile.ts";
import type { Structure } from "./entities/structure.ts";
import type { Missile } from "./entities/missile.ts";
import type { Mine } from "./entities/mine.ts";
import type { Nuke } from "./entities/nuke.ts";
import type { Turret } from "./entities/turret.ts";
import { mapPickup, type Pickup } from "./entities/pickup.ts";
import type { InputState } from "./input.ts";
import type { Rng } from "./math/rng.ts";
import type { SimEvent } from "./events.ts";
import type { ModeConfig, ModeState } from "./modes/mode.ts";
import { createModeState } from "./modes/registry.ts";
import { createBot, type BotState } from "./ai/botState.ts";
import type { Difficulty } from "./data/aiDefs.ts";
import type { Queen } from "./entities/queen.ts";
import type { CampaignState } from "./campaign/state.ts";
import type { PerkId } from "./progression/perks.ts";
import type { MatchStats } from "./progression/stats.ts";
import type { Zone } from "./modes/koth.ts";
import type { HordeState } from "./modes/horde.ts";
import type { BossState, Strike } from "./campaign/boss.ts";
import { modeRules } from "./modes/registry.ts";
import { pickSpawn } from "./systems/stepRespawn.ts";

export interface World {
  tick: number;
  dt: number;
  map: GameMap;
  /** index into `structures` per cell (row-major), -1 = open road. Structures are never removed. */
  grid: number[];
  tanks: Tank[];
  projectiles: Projectile[];
  missiles: Missile[];
  mines: Mine[];
  nukes: Nuke[];
  turrets: Turret[];
  pickups: Pickup[];
  structures: Structure[];
  inputs: Record<number, InputState>;
  nextId: number;
  rng: Rng;
  mode: ModeState;
  queens: Queen[];
  /** Battlelord rail Goliaths */
  rails: Rail[];
  bots: Record<number, BotState>;
  /** last tick's events: what bots could hear */
  recentEvents: SimEvent[];
  campaign: CampaignState | undefined;
  stats: Record<number, MatchStats>;
  zone: Zone | undefined;
  horde: HordeState | undefined;
  bosses: BossState[];
  /** Convoy mode */
  convoy?: ConvoyState;
  /** server only: rewind history for hitscan lag compensation */
  lagComp?: LagComp;
  strikes: Strike[];
}

/** `perks: false` strips loadouts (Classic / ranked lobbies). */
export interface WorldOptions { seed?: number; mode?: ModeConfig; campaign?: CampaignState; perks?: boolean }

/** A player slot: a gang (rotating roster + signature) or a single fixed tank kind; `bot` makes it AI-driven. */
export interface TankSlot { team: number; kind?: TankKind; gang?: GangId; bot?: Difficulty; name?: string; perks?: PerkId[] }

export function createWorld(map: GameMap, slots: TankSlot[], opts: WorldOptions = {}): World {
  const world: World = {
    tick: 0, dt: 1 / rules.tickRate, map,
    grid: new Array<number>(map.cols * map.rows).fill(-1),
    tanks: [], projectiles: [], missiles: [], mines: [], nukes: [], turrets: [], pickups: [], structures: [],
    inputs: {}, nextId: 1, rng: { state: opts.seed ?? 1 },
    mode: createModeState(opts.mode ?? { kind: "deathmatch" }), queens: [], rails: [], bots: {}, recentEvents: [], campaign: opts.campaign, stats: {}, zone: undefined, horde: undefined, bosses: [], strikes: [],
  };
  for (const s of map.structures) {
    const id = world.nextId++;
    const hp = rules.structures[s.kind].hp;
    world.grid[s.cy * map.cols + s.cx] = world.structures.length;
    world.structures.push({ id, kind: s.kind, cx: s.cx, cy: s.cy, hp, maxHp: hp, stage: 0 });
  }
  for (const p of map.pickups) world.pickups.push(mapPickup(world, p));
  const mode = modeRules[world.mode.kind];
  const teams = mode.teamCount ?? (mode.usesFortresses ? Math.max(2, map.fortresses.length) : Infinity);
  const fixedTeams = slots.every((s) => s.team < teams);
  const withPerks = (s: TankSlot): TankSlot => (opts.perks === false ? { ...s, perks: [] } : s);
  const teamFor = (s: TankSlot, i: number) => mode.allTeam ?? (fixedTeams ? s.team : i % teams);
  slots.forEach((slot, i) => addTank(world, withPerks({ ...slot, team: teamFor(slot, i) }), i));
  if (mode.usesFortresses) for (const t of world.tanks) {
    t.pos = { ...pickSpawn(world, t.team) };
    t.rot = t.turretRot = faceCentre(world, t.pos);
  }
  mode.setup?.(world);
  return world;
}

export function addTank(world: World, slot: TankSlot, spawnIndex: number): Tank {
  const spawn = world.map.spawns[spawnIndex % world.map.spawns.length] ?? { x: 0, y: 0 };
  const tank = newTank(world, slot, spawn);
  tank.rot = tank.turretRot = faceCentre(world, tank.pos);
  world.tanks.push(tank);
  if (slot.bot) world.bots[tank.id] = createBot(slot.bot);
  return tank;
}

export const tankById = (world: World, id: number): Tank | undefined => world.tanks.find((t) => t.id === id);

/** Spawned tanks face the middle of the map rather than the nearest wall. */
export function faceCentre(world: World, p: { x: number; y: number }): number {
  const c = world.map.cell;
  return Math.atan2((world.map.rows * c) / 2 - p.y, (world.map.cols * c) / 2 - p.x);
}
