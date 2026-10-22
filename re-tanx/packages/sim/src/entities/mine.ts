import type { Vec2 } from "../math/vec2.ts";

export interface Mine { id: number; ownerId: number; team: number; pos: Vec2; armIn: number }
