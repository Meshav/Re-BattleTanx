import type { Vec2 } from "../math/vec2.ts";

/** guided: steered by its owner's input. swarm / rocket: home on targetId. */
export interface Missile {
  id: number; ownerId: number; team: number; kind: "guided" | "swarm" | "rocket";
  pos: Vec2; rot: number; speed: number; turnRate: number;
  damage: number; splash: number; fuel: number; targetId: number | undefined;
}
