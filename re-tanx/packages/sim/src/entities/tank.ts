import { TANKS, type TankKind } from '../data/tanks';

export type EntityId = number;

export interface Tank {
  id: EntityId;
  kind: TankKind;
  /** metres, on the ground plane */
  x: number;
  y: number;
  /** radians, 0 = +x, counter-clockwise */
  heading: number;
  /** signed m/s along heading; negative = reversing */
  speed: number;
  hp: number;
}

export function createTank(id: EntityId, kind: TankKind, x: number, y: number): Tank {
  return { id, kind, x, y, heading: 0, speed: 0, hp: TANKS[kind].hp };
}
