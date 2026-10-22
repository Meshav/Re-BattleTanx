import type { World } from "../world.ts";
import type { Tank } from "../entities/tank.ts";
import type { ObjectiveDef } from "./missionDefs.ts";
import type { CampaignState } from "./state.ts";
import { dist } from "../math/vec2.ts";
import { RUBBLE } from "../entities/structure.ts";

const REACH_RADIUS = 9;

export const humans = (world: World): Tank[] => world.tanks.filter((t) => t.team === 0 && !world.bots[t.id]);

export const waveCleared = (world: World, c: CampaignState, i: number): boolean =>
  c.wavesSpawned[i] === true && (c.waveTanks[i] ?? []).every((id) => !world.tanks.find((t) => t.id === id)?.alive);

/** Live check for one objective. Optional "end-of-mission" ones only fail during play. */
export function evaluate(world: World, c: CampaignState, def: ObjectiveDef): { done: boolean; failed: boolean } {
  switch (def.kind) {
    case "destroyAll":
      return { done: c.wavesSpawned.every(Boolean) && c.wavesSpawned.every((_, i) => waveCleared(world, c, i)), failed: false };
    case "destroyTargets":
      return { done: world.structures.filter((s) => s.kind === "target").every((s) => s.stage === RUBBLE), failed: false };
    case "reach":
      return { done: humans(world).some((t) => t.alive && world.map.reach.some((r) => dist(r, t.pos) <= REACH_RADIUS)), failed: false };
    case "rescue":
      return { done: world.queens.some((q) => q.state === "home" && q.team === 0 && world.map.extraction.some((e) => dist(e, q.pos) <= REACH_RADIUS)), failed: false };
    case "survive":
      return { done: c.elapsed >= (def.seconds ?? 60), failed: false };
    case "noDeaths":
      return { done: false, failed: c.playerDeaths > 0 };
    case "parTime":
      return { done: false, failed: c.elapsed > (def.seconds ?? 300) };
    case "stopRunners":
      return { done: c.runners.length > 0 && c.runners.every((id) => !world.tanks.find((t) => t.id === id)?.alive), failed: false };
    case "destroyTurrets":
      return { done: world.turrets.every((t) => t.team === 0), failed: false };
    case "caches":
      return { done: !world.pickups.some((p) => p.kind === "bucks"), failed: false };
  }
}

/** Primary objectives stay done once done (you can't un-reach a point). */
export function updateObjectives(world: World, c: CampaignState): boolean {
  let newlyDone = false;
  c.mission.objectives.forEach((def, i) => {
    const st = c.objectives[i]!;
    if (st.done || st.failed) return;
    const now = evaluate(world, c, def);
    st.failed = now.failed;
    if (now.done && !def.optional) newlyDone = true;
    st.done = now.done;
  });
  return newlyDone;
}

/** Called at victory: optional end-of-mission objectives that never failed count as done. */
export function settleOptionals(c: CampaignState): void {
  c.mission.objectives.forEach((def, i) => {
    const st = c.objectives[i]!;
    if (def.optional && !st.failed && (def.kind === "noDeaths" || def.kind === "parTime")) st.done = true;
  });
}

export const primariesDone = (c: CampaignState): boolean => c.mission.objectives.every((d, i) => d.optional || c.objectives[i]!.done);
