import type { Vec2 } from "../math/vec2.ts";

/** Battlelord's rail-mounted Goliath: a track by each fortress; a defender who parks on it mans a heavy gun that slides along it. */
export interface Rail { id: number; team: number; a: Vec2; b: Vec2; riderId: number | undefined; turnHeld: number }
