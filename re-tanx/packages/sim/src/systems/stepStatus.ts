import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import { maxHp } from "../entities/tank.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { applyDamage } from "./applyDamage.ts";

/** Timed effects: burning hurts, repair heals, everything counts down. */
export function stepStatus(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  const dt = world.dt;
  for (const t of world.tanks) {
    const fx = t.fx;
    if (!t.alive) continue;
    if (fx.burn > 0) events.push(...applyDamage(world, { target: t, amount: fx.burnDps * dt, sourceId: fx.burnBy, from: t.pos, raw: true }));
    if (fx.repair > 0) t.hp = Math.min(maxHp(t), t.hp + specialDefs.repair.hps * dt);
    fx.burn = Math.max(0, fx.burn - dt);
    fx.stun = Math.max(0, fx.stun - dt);
    fx.cloak = Math.max(0, fx.cloak - dt);
    fx.boost = Math.max(0, fx.boost - dt);
    fx.repair = Math.max(0, fx.repair - dt);
  }
  return events;
}
