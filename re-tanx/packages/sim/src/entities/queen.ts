import type { Vec2 } from "../math/vec2.ts";

/**
 * A QueenLord. `team` -1 = neutral (Frenzy / Hold 'Em).
 * home: at her own fortress · carried: riding a tank · dropped: lying in the street · held: captive at another team's fortress.
 */
export interface Queen {
  id: number; team: number; pos: Vec2; home: Vec2;
  state: "home" | "carried" | "dropped" | "held";
  carrierId: number | undefined; heldBy: number | undefined; droppedFor: number;
}

export const carriedBy = (queens: Queen[], tankId: number): Queen | undefined => queens.find((q) => q.carrierId === tankId);
