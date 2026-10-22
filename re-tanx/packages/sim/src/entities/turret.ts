import type { Vec2 } from "../math/vec2.ts";

/** A deployed sentry gun. Shoots the nearest enemy; can be shot back. */
export interface Turret { id: number; ownerId: number; team: number; pos: Vec2; rot: number; hp: number; life: number; cooldown: number }

export const TURRET_RADIUS = 1.4;
