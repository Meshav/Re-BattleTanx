import type { Vec2 } from "../math/vec2.ts";

export interface Nuke { id: number; ownerId: number; pos: Vec2; fuse: number }
