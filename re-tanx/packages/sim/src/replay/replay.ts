import type { InputState } from "../input.ts";
import type { SimEvent } from "../events.ts";
import { createWorld, type TankSlot, type World, type WorldOptions } from "../world.ts";
import type { TankKind } from "../data/tankDefs.ts";
import type { Difficulty } from "../data/aiDefs.ts";
import { createMissionWorld } from "../campaign/createMission.ts";
import { deployTank } from "../campaign/deploy.ts";
import { missionById } from "../data/missions.ts";
import { checkMap } from "../data/mapCheck.ts";
import type { MapJson } from "../data/map.ts";
import { createBot } from "../ai/botState.ts";
import { createLagComp } from "../systems/lagComp.ts";
import { parseMap } from "../data/map.ts";
import { mapById } from "../data/maps.ts";
import { idleInput } from "../input.ts";
import { stepWorld } from "../stepWorld.ts";
import { tankKinds } from "../data/tankDefs.ts";
import { gangIds } from "../data/gangDefs.ts";
import { difficulties } from "../data/aiDefs.ts";
import { perkIds } from "../progression/perks.ts";
import { specialKinds } from "../data/specialDefs.ts";
import { maxBond, oracleIds } from "../progression/oracles.ts";
import type { Loadout } from "../progression/loadout.ts";
import type { OracleLink } from "../entities/tank.ts";
import { modeRules } from "../modes/registry.ts";

/** [tick, throttle×100, steer×100, strafe×100, aim×1000, fire|special<<1, cycle, (view offset for lag compensation)] */
type Packed = [number, number, number, number, number, number, number] | [number, number, number, number, number, number, number, number];

/** A campaign mission is rebuilt from its id and the opening purchase instead of slots. */
export interface MissionSetup { id: string; players: TankKind[]; bucks: number; difficulty: Difficulty; seed: number; countdown?: boolean; loadouts?: Loadout[]; allyOracles?: OracleLink[]; names?: string[] }

/** [tick, human index, what]: a tank kind = campaign redeploy, "bot" = that player left and a bot took the tank, "human" = they rejoined. */
export type ReplayAction = [number, number, string];

/** Everything needed to re-run a match: the sim is deterministic, so setup + human inputs + rare actions suffice. */
export interface Replay {
  version: 1;
  map: string;
  slots: TankSlot[];
  opts: Pick<WorldOptions, "seed" | "mode" | "perks">;
  mission?: MissionSetup;
  /** player-made arena the match was played on (validated by checkMap on load) */
  customMap?: MapJson;
  /** the match ran with server lag compensation (inputs carry view offsets) */
  lagComp?: boolean;
  ticks: number;
  /** per human tank index: inputs only on ticks where they changed */
  inputs: Packed[][];
  actions?: ReplayAction[];
}

export type ReplaySetup = Pick<Replay, "map" | "slots" | "opts" | "mission" | "customMap" | "lagComp">;

/**
 * Round inputs to what a replay can store. The live match must step with the
 * rounded values too, or playback drifts.
 */
export function quantizeInput(i: InputState): InputState {
  const q = (v: number, k: number) => Math.round(v * k) / k;
  return { ...i, throttle: q(i.throttle, 100), steer: q(i.steer, 100), strafe: q(i.strafe, 100), aim: q(i.aim, 1000) };
}

const pack = (tick: number, i: InputState, viewOffset?: number): Packed => {
  const p: Packed = [tick, Math.round(i.throttle * 100), Math.round(i.steer * 100), Math.round(i.strafe * 100), Math.round(i.aim * 1000), (i.fire ? 1 : 0) | (i.special ? 2 : 0), i.cycle];
  return viewOffset === undefined ? p : [...p, viewOffset] as Packed;
};

const unpack = (p: Packed): InputState =>
  ({ throttle: p[1] / 100, steer: p[2] / 100, strafe: p[3] / 100, aim: p[4] / 1000, fire: (p[5] & 1) !== 0, special: (p[5] & 2) !== 0, cycle: p[6] });

const same = (a: Packed, b: Packed) => a.length === b.length && a.every((v, k) => k === 0 || v === b[k]);

export interface Recorder {
  record(world: World): void;
  /** log a world change that isn't an input (redeploy, bot takeover); call between ticks */
  action(world: World, human: number, what: string): void;
  finish(world: World): Replay;
}

/** Call record() right after the humans' inputs are set and before stepWorld. */
export function createRecorder(setup: ReplaySetup, humans: number): Recorder {
  const inputs: Packed[][] = Array.from({ length: humans }, () => []);
  const actions: ReplayAction[] = [];
  const botted = new Set<number>();
  return {
    action(world, human, what) {
      actions.push([world.tick, human, what]);
      if (what === "bot") botted.add(human);
      if (what === "human") botted.delete(human);
    },
    record(world) {
      for (let h = 0; h < humans; h++) {
        if (botted.has(h)) continue;
        const id = world.tanks[h]?.id;
        const input = id === undefined ? undefined : world.inputs[id];
        if (!input) continue;
        const view = world.lagComp?.view[id!];
        const p = pack(world.tick, input, view === undefined ? undefined : world.tick - view);
        const list = inputs[h]!;
        const last = list[list.length - 1];
        if (!last || !same(last, p)) list.push(p);
      }
    },
    finish: (world) => ({ version: 1, ...setup, ticks: world.tick, inputs, ...(actions.length ? { actions } : {}) }),
  };
}

export interface Playback { world: World; step(): SimEvent[]; readonly done: boolean }

/** Rebuild the match and feed the recorded inputs back, one tick per step(). */
export function playReplay(r: Replay): Playback {
  const mission = r.mission && missionById(r.mission.id);
  const world = r.mission && mission ? createMissionWorld({ ...r.mission, mission }) : createWorld(parseMap(r.customMap ?? mapById(r.map)), r.slots, r.opts);
  const cursor = r.inputs.map(() => 0);
  const current = r.inputs.map(() => idleInput());
  const offsets: (number | undefined)[] = r.inputs.map(() => undefined);
  if (r.lagComp) world.lagComp = createLagComp();
  const actions = r.actions ?? [];
  const botted = new Set<number>();
  let next = 0;
  return {
    world,
    step() {
      while (next < actions.length && actions[next]![0] <= world.tick) {
        const [, h, what] = actions[next++]!;
        const id = world.tanks[h]?.id;
        if (id === undefined) continue;
        if (what === "bot") {
          botted.add(h);
          world.bots[id] = createBot("normal");
        } else if (what === "human") {
          botted.delete(h);
          delete world.bots[id];
        } else deployTank(world, id, what as TankKind);
      }
      r.inputs.forEach((list, h) => {
        if (botted.has(h)) {
          const id = world.tanks[h]?.id;
          if (id !== undefined) delete world.lagComp?.view[id];
          return;
        }
        while (cursor[h]! < list.length && list[cursor[h]!]![0] <= world.tick) {
          const p = list[cursor[h]!++]!;
          current[h] = unpack(p);
          offsets[h] = p[7];
        }
        const id = world.tanks[h]?.id;
        if (id === undefined) return;
        world.inputs[id] = current[h]!;
        if (world.lagComp && offsets[h] !== undefined) world.lagComp.view[id] = world.tick - offsets[h]!;
        else if (world.lagComp) delete world.lagComp.view[id];
      });
      return stepWorld(world);
    },
    get done() { return world.mode.over || world.tick >= r.ticks; },
  };
}

const goodSlot = (s: TankSlot) => !!s && Number.isInteger(s.team) && s.team >= 0 && s.team < 16
  && (s.kind === undefined || tankKinds.includes(s.kind)) && (s.gang === undefined || gangIds.includes(s.gang))
  && (s.bot === undefined || difficulties.includes(s.bot)) && goodLoadout(s);

const perkList = (v: unknown) => v === undefined || (Array.isArray(v) && v.every((p) => perkIds.includes(p)));
const counts = (v: unknown, keys: readonly string[]) => v === undefined || (typeof v === "object" && v !== null
  && Object.entries(v).every(([k, n]) => keys.includes(k) && typeof n === "number" && Number.isFinite(n) && n >= 0));
const goodOracle = (o: OracleLink) => !!o && oracleIds.includes(o.id) && Number.isInteger(o.bond) && o.bond >= 1 && o.bond <= maxBond;
const goodLoadout = (l: Loadout) => !!l && perkList(l.perks) && perkList(l.pros) && counts(l.weaponXp, specialKinds) && counts(l.mastery, tankKinds)
  && (l.oracle === undefined || goodOracle(l.oracle));
const listOf = <T>(v: T[] | undefined, ok: (x: T) => boolean) => v === undefined || (Array.isArray(v) && v.length <= 4 && v.every(ok));

const goodMission = (m: MissionSetup) => !!m && missionById(m.id) !== undefined && Array.isArray(m.players) && m.players.length >= 1 && m.players.length <= 4
  && m.players.every((k) => tankKinds.includes(k)) && difficulties.includes(m.difficulty) && Number.isFinite(m.bucks) && Number.isInteger(m.seed)
  && listOf(m.loadouts, goodLoadout) && listOf(m.allyOracles, goodOracle) && listOf(m.names, (n) => typeof n === "string" && n.length <= 24);

/** Shape check for replays loaded from storage or a shared file (untrusted: a bad one must not crash the sim). */
export function isReplay(v: unknown): v is Replay {
  const r = v as Replay;
  return !!r && r.version === 1 && typeof r.map === "string" && Array.isArray(r.slots) && r.slots.length <= 16 && r.slots.every(goodSlot)
    && (!r.opts?.mode || Object.hasOwn(modeRules, r.opts.mode.kind)) && Array.isArray(r.inputs) && r.inputs.length <= Math.max(r.slots.length, r.mission?.players.length ?? 0) && Number.isInteger(r.ticks)
    && (r.mission === undefined || goodMission(r.mission))
    && (r.customMap === undefined || checkMap(r.customMap).map !== undefined)
    && (r.actions === undefined || (Array.isArray(r.actions) && r.actions.every((a) => Array.isArray(a) && Number.isInteger(a[0]) && Number.isInteger(a[1]) && (a[2] === "bot" || a[2] === "human" || tankKinds.includes(a[2] as TankKind)))))
    && r.inputs.every((l) => Array.isArray(l) && l.every((p) => Array.isArray(p) && (p.length === 7 || p.length === 8) && p.every(Number.isFinite)));
}
