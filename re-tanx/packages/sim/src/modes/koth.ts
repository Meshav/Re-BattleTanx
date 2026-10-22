import type { World } from "../world.ts";
import type { ModeRules } from "./mode.ts";
import type { Vec2 } from "../math/vec2.ts";
import { limitWin, noScore } from "./mode.ts";
import { modeDefs } from "../data/modeDefs.ts";
import { randomOpenPoint } from "../ai/nav/grid.ts";
import { nextRandom } from "../math/rng.ts";
import { dist } from "../math/vec2.ts";

const def = modeDefs.koth;

/** The hill. `holder` is the team scoring right now (-1 empty, -2 contested). */
export interface Zone { pos: Vec2; radius: number; moveIn: number; holder: number }

export function teamsInZone(world: World, z: Zone): number[] {
  return [...new Set(world.tanks.filter((t) => t.alive && dist(t.pos, z.pos) <= z.radius).map((t) => t.team))];
}

/** King of the Rubble: hold the zone alone to score; it moves every minute. */
export const koth: ModeRules = {
  setup(world) {
    world.zone = { pos: randomOpenPoint(world, () => nextRandom(world.rng)), radius: def.radius, moveIn: def.moveEvery, holder: -1 };
  },
  onTick(world) {
    const z = world.zone;
    if (!z) return [];
    z.moveIn -= world.dt;
    if (z.moveIn <= 0) {
      z.pos = randomOpenPoint(world, () => nextRandom(world.rng));
      z.moveIn = def.moveEvery;
      return [{ type: "zone", pos: { ...z.pos } }];
    }
    const inside = teamsInZone(world, z);
    z.holder = inside.length === 1 ? inside[0]! : inside.length ? -2 : -1;
    if (z.holder >= 0) world.mode.scores[z.holder] = (world.mode.scores[z.holder] ?? 0) + def.pointsPerSecond * world.dt;
    return [];
  },
  onKill: noScore,
  canRespawn: () => true,
  checkWin: limitWin,
};
