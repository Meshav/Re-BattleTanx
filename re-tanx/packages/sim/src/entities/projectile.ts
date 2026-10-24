import type { Vec2 } from "../math/vec2.ts";
import type { SpecialKind } from "../data/specialDefs.ts";

export interface Projectile {
  id: number; ownerId: number; pos: Vec2; vel: Vec2;
  damage: number; splash: number; ttl: number;
  /** mortar: flies over walls and tanks, bursts when ttl runs out */
  lobbed?: boolean;
  /** fired by a special (plasma) rather than the main gun */
  weapon?: SpecialKind;
}
