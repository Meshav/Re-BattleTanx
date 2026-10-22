import type { ModeRules } from "./mode.ts";
import type { World } from "../world.ts";
import { scoreKill } from "./mode.ts";
import { modeDefs } from "../data/modeDefs.ts";
import { cellOf } from "../queries/cells.ts";

const def = modeDefs.siege;
export const DEFENDERS = 0;

export const siegeCore = (world: World) => world.structures.find((s) => s.kind === "core");

/** Siege: team 0 holds the core at its fortress until the clock runs out; team 1 has to bring it down. */
export const siege: ModeRules = {
  usesFortresses: true,
  teamCount: 2,
  setup(world) {
    const home = world.map.fortresses[DEFENDERS];
    if (!home) return;
    const { cx, cy } = cellOf(world, home);
    const idx = cy * world.map.cols + cx;
    if (world.grid[idx]! >= 0) return; // fortress cell already built on; map is unfit for siege
    world.grid[idx] = world.structures.length;
    world.structures.push({ id: world.nextId++, kind: "core", cx, cy, hp: def.coreHp, maxHp: def.coreHp, stage: 0 });
    world.mode.coreHp = world.mode.coreMax = def.coreHp;
  },
  onTick(world) {
    const core = siegeCore(world);
    if (core) world.mode.coreHp = Math.ceil(core.hp);
    return [];
  },
  onKill: scoreKill,
  canRespawn: () => true,
  checkWin(world) {
    const core = siegeCore(world);
    if (core && core.hp <= 0) return 1 - DEFENDERS;
    return world.mode.elapsed >= world.mode.timeLimit && world.mode.timeLimit > 0 ? DEFENDERS : undefined;
  },
};
