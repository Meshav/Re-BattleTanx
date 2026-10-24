import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { Tank } from "../entities/tank.ts";
import type { Structure } from "../entities/structure.ts";
import type { Vec2 } from "../math/vec2.ts";
import { dist } from "../math/vec2.ts";
import { rules } from "../data/rules.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { applyDamage, hitStructure } from "./applyDamage.ts";
import { damageTurret } from "./damageAt.ts";
import type { SpecialKind } from "../data/specialDefs.ts";

export interface Splash {
  pos: Vec2; radius: number; damage: number; sourceId: number;
  /** tank / structure struck directly take full damage */
  direct?: Tank | undefined; directStructure?: Structure | undefined;
  /** special that caused it (see DamageHit.weapon) */
  weapon?: SpecialKind | undefined;
}

/** Linear falloff from centre to radius; owner takes the self-splash fraction. */
export function applySplash(world: World, s: Splash): SimEvent[] {
  const events: SimEvent[] = [{ type: "explode", pos: { ...s.pos }, radius: s.radius }];
  for (const t of world.tanks) {
    if (!t.alive) continue;
    const edge = Math.max(0, dist(t.pos, s.pos) - tankDefs[t.kind].radius);
    const falloff = t === s.direct ? 1 : 1 - edge / s.radius;
    if (falloff <= 0) continue;
    const self = t.id === s.sourceId ? rules.selfSplashFactor : 1;
    events.push(...applyDamage(world, { target: t, amount: s.damage * falloff * self, sourceId: s.sourceId, from: s.pos, weapon: s.weapon }));
  }
  for (const tu of world.turrets) {
    const k = 1 - dist(tu.pos, s.pos) / s.radius;
    if (k > 0) events.push(...damageTurret(tu, s.damage * k));
  }
  const c = world.map.cell;
  for (const st of world.structures) {
    const centre = { x: (st.cx + 0.5) * c, y: (st.cy + 0.5) * c };
    const edge = Math.max(0, dist(centre, s.pos) - c / 2);
    const falloff = st === s.directStructure ? 1 : 1 - edge / s.radius;
    if (falloff > 0) events.push(...hitStructure(world, st, s.damage * falloff, s.sourceId, s.weapon));
  }
  return events;
}
