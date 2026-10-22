import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Vec2 } from "../math/vec2.ts";
import type { Tank } from "../entities/tank.ts";
import { dist } from "../math/vec2.ts";
import { faceCentre } from "../world.ts";
import { startLife } from "../entities/tank.ts";
import { modeRules } from "../modes/registry.ts";

/** Objective modes: nearest free-ish spawn to your fortress. Otherwise: farthest from the nearest living enemy. */
export function pickSpawn(world: World, team: number): Vec2 {
  const home = modeRules[world.mode.kind].usesFortresses ? world.map.fortresses[team] : undefined;
  if (home) return nearHome(world, home);
  const enemies = world.tanks.filter((t) => t.alive && t.team !== team);
  let best = world.map.spawns[0] ?? { x: 0, y: 0 }, bestScore = -1;
  for (const sp of world.map.spawns) {
    const score = enemies.length ? Math.min(...enemies.map((e) => dist(e.pos, sp))) : 0;
    if (score > bestScore) { best = sp; bestScore = score; }
  }
  return best;
}

export function respawnTank(world: World, tank: Tank): SimEvent {
  tank.pos = { ...pickSpawn(world, tank.team) };
  tank.rot = tank.turretRot = faceCentre(world, tank.pos);
  startLife(world, tank);
  return { type: "spawn", tankId: tank.id, pos: { ...tank.pos } };
}

export function stepRespawn(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  for (const tank of world.tanks) {
    if (tank.alive || !modeRules[world.mode.kind].canRespawn(world, tank)) continue;
    tank.respawnIn -= world.dt;
    if (tank.respawnIn <= 0) events.push(respawnTank(world, tank));
  }
  return events;
}

function nearHome(world: World, home: Vec2): Vec2 {
  const byDist = [...world.map.spawns].sort((a, b) => dist(a, home) - dist(b, home));
  const free = byDist.find((sp) => !world.tanks.some((t) => t.alive && dist(t.pos, sp) < 6));
  return free ?? byDist[0] ?? home;
}
