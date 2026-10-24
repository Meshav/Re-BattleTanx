import type { Vec2 } from "./math/vec2.ts";
import type { SpecialKind } from "./data/specialDefs.ts";
import type { PickupKind } from "./data/pickupDefs.ts";

export type SimEvent =
  | { type: "fire"; tankId: number; pos: Vec2; rot: number; weapon: string }
  | { type: "hit"; targetId: number; sourceId: number; amount: number; pos: Vec2 }
  | { type: "explode"; pos: Vec2; radius: number }
  /** weapon: the special that did it (main gun, rams and burns have none) */
  | { type: "kill"; victimId: number; killerId: number; weapon?: SpecialKind }
  | { type: "spawn"; tankId: number; pos: Vec2 }
  | { type: "structureStage"; structureId: number; stage: number; by?: number }
  | { type: "special"; tankId: number; kind: SpecialKind; super: boolean; pos: Vec2 }
  | { type: "pickup"; tankId: number; kind: PickupKind; pos: Vec2 }
  | { type: "shieldHit"; tankId: number; absorbed: number }
  | { type: "nukeDetonate"; pos: Vec2 }
  | { type: "mineTrigger"; pos: Vec2 }
  | { type: "matchOver"; winner: number }
  | { type: "zone"; pos: Vec2 }
  | { type: "bossPhase"; tankId: number; phase: number }
  | { type: "strikeWarn"; pos: Vec2; radius: number }
  | { type: "wave"; wave: number; count: number }
  | { type: "round"; round: number; winner: number }
  /** pre-match count-in: beats left (0 = go) */
  | { type: "countdown"; left: number }
  | { type: "convoy"; what: "delivered"; tankId: number; team: number }
  | { type: "rail"; what: "mount" | "dismount"; tankId: number }
  | { type: "queen"; what: "taken" | "dropped" | "returned" | "captured"; queenId: number; team: number; pos: Vec2 };
