import type { World } from "../world.ts";
import type { ModeRules } from "./mode.ts";
import type { SimEvent } from "../events.ts";
import type { TankKind } from "../data/tankDefs.ts";
import type { Difficulty } from "../data/aiDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { modeDefs } from "../data/modeDefs.ts";
import { addTank, faceCentre } from "../world.ts";
import { pick } from "../math/rng.ts";
import { dist } from "../math/vec2.ts";

const def = modeDefs.horde;
type Cls = keyof typeof def.cost;

export interface HordeState { wave: number; lives: number; breakFor: number; waveTanks: number[] }

/** Doc 06 §6.9: budget = base + wave × perWave × players^0.8. */
export const waveBudget = (wave: number, players: number): number => Math.round(def.budget.base + wave * def.budget.perWave * Math.pow(Math.max(1, players), def.budget.playerExp));

const classOf = (k: TankKind): Cls => (tankDefs[k].class as Cls) in def.cost ? (tankDefs[k].class as Cls) : "medium";
const difficultyFor = (wave: number): Difficulty => ((def.difficultyByWave as [number, Difficulty][]).filter(([w]) => wave >= w).at(-1)?.[1] ?? "easy");

/** Spend the wave budget on a random mix; boss waves add the boss pair on top. */
export function composeWave(world: World, wave: number, players: number): TankKind[] {
  let left = waveBudget(wave, players);
  const out: TankKind[] = wave % def.bossEvery === 0 ? [...(def.boss as TankKind[])] : [];
  const classes = (Object.keys(def.cost) as Cls[]).filter((c) => wave >= 3 || c !== "special");
  while (left > 0 && out.length < 16) {
    const cls = pick(world.rng, classes.filter((c) => def.cost[c] <= left).concat(left < 1 ? [] : ["light"]));
    out.push(pick(world.rng, def.pool[cls] as TankKind[]));
    left -= def.cost[cls];
  }
  return out;
}

const humans = (world: World) => world.tanks.filter((t) => t.team === 0 && !world.bots[t.id]);

function spawnWave(world: World, h: HordeState): SimEvent[] {
  h.wave++;
  const players = humans(world).length;
  const spots = [...(world.map.enemySpawns.length ? world.map.enemySpawns : world.map.spawns)]
    .sort((a, b) => Math.min(...humans(world).map((t) => dist(t.pos, b))) - Math.min(...humans(world).map((t) => dist(t.pos, a))));
  // clear last wave's wrecks so the tank list doesn't grow forever
  world.tanks = world.tanks.filter((t) => t.team === 0 || t.alive);
  h.waveTanks = composeWave(world, h.wave, players).map((kind, i) => {
    const t = addTank(world, { team: 1, kind, bot: difficultyFor(h.wave), name: h.wave % def.bossEvery === 0 && i < def.boss.length ? "Warlord" : "Raider" }, 0);
    const s = spots[i % Math.max(1, Math.ceil(spots.length / 2))]!;
    t.pos = { x: s.x + ((i % 3) - 1) * 4, y: s.y + (Math.floor(i / 3) % 3) * 4 - 4 };
    t.rot = t.turretRot = faceCentre(world, t.pos);
    return t.id;
  });
  if (h.wave % def.bossEvery === 1 && h.wave > 1) h.lives += def.lifePerBoss;
  return [{ type: "wave", wave: h.wave, count: h.waveTanks.length }];
}

/** Horde: everyone on one team against escalating waves. Shared lives; survive `scoreLimit` waves to win. */
export const horde: ModeRules = {
  allTeam: 0,
  setup(world) {
    world.horde = { wave: 0, lives: def.lives, breakFor: 3, waveTanks: [] };
  },
  onTick(world) {
    const h = world.horde!;
    world.mode.scores[0] = Math.max(0, h.wave - 1);
    const cleared = h.waveTanks.every((id) => !world.tanks.find((t) => t.id === id)?.alive);
    if (!cleared) return [];
    if (h.breakFor > 0) {
      h.breakFor -= world.dt;
      return [];
    }
    world.mode.scores[0] = h.wave;
    if (h.wave >= world.mode.scoreLimit) return [];
    h.breakFor = def.breakSeconds;
    return spawnWave(world, h);
  },
  onKill(world, victim) {
    if (victim.team === 0 && !world.bots[victim.id] && world.horde) world.horde.lives--;
  },
  canRespawn: (world, tank) => tank.team === 0 && (world.horde?.lives ?? 0) >= 0,
  checkWin(world) {
    const h = world.horde!;
    const cleared = h.waveTanks.every((id) => !world.tanks.find((t) => t.id === id)?.alive);
    if (h.wave >= world.mode.scoreLimit && cleared) return 0;
    const out = h.lives < 0 && humans(world).every((t) => !t.alive);
    return out ? 1 : undefined;
  },
};
