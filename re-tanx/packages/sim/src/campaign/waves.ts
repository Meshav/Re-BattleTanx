import type { World } from "../world.ts";
import type { CampaignState } from "./state.ts";
import type { WaveTrigger } from "./missionDefs.ts";
import type { SimEvent } from "../events.ts";
import { addTank, faceCentre } from "../world.ts";
import { waveCleared } from "./objectives.ts";
import { RUBBLE } from "../entities/structure.ts";
import { dist } from "../math/vec2.ts";
import { campaignDefs } from "./missionDefs.ts";

function due(world: World, c: CampaignState, t: WaveTrigger): boolean {
  if (t === "start") return true;
  if ("after" in t) return c.elapsed >= t.after;
  if ("cleared" in t) return waveCleared(world, c, t.cleared);
  if ("targetsDown" in t) return world.structures.filter((s) => s.kind === "target").every((s) => s.stage === RUBBLE);
  if ("decoy" in t) return c.decoySprung;
  const reachIdx = c.mission.objectives.findIndex((o) => o.kind === "reach");
  return reachIdx >= 0 && c.objectives[reachIdx]!.done;
}

/** Bring in any wave whose trigger has fired, at the map's enemy spawn points. */
export function stepWaves(world: World, c: CampaignState): SimEvent[] {
  const events: SimEvent[] = [];
  c.mission.waves.forEach((wave, i) => {
    if (c.wavesSpawned[i] || !due(world, c, wave.trigger)) return;
    c.wavesSpawned[i] = true;
    const spots = world.map.enemySpawns.length ? world.map.enemySpawns : world.map.spawns;
    wave.tanks.forEach((kind, j) => {
      const t = addTank(world, { team: 1, kind, bot: wave.difficulty ?? c.difficulty, name: "Raider" }, 0);
      const spot = spots[(i + j) % spots.length]!;
      t.pos = { x: spot.x + (j % 2) * 4 - 2, y: spot.y + Math.floor(j / 2) * 4 - 2 };
      t.rot = t.turretRot = faceCentre(world, t.pos);
      c.waveTanks[i]!.push(t.id);
      if (wave.boss && j === 0) {
        t.name = "Warlord";
        world.bosses.push({ tankId: t.id, phase: 0, barrageIn: campaignDefs.boss.barrage[0]!.every });
      }
      if (wave.runner) markRunner(world, c, t.id);
      events.push({ type: "spawn", tankId: t.id, pos: { ...t.pos } });
    });
  });
  return events;
}

/** Runner: heads for the exit farthest from where it spawned (so there's a chase). */
function markRunner(world: World, c: CampaignState, id: number): void {
  const t = world.tanks.find((k) => k.id === id)!;
  const exit = [...world.map.exits].sort((a, b) => dist(b, t.pos) - dist(a, t.pos))[0];
  const bot = world.bots[id];
  if (!exit || !bot) return;
  bot.escapeTo = { ...exit };
  c.runners.push(id);
}
