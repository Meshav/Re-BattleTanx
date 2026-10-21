import tanksJson from '../../../../data/tanks.json';

export type TankClass = 'light' | 'medium' | 'heavy';

export interface TankStats {
  class: TankClass;
  hp: number;
  armor: number;
  /** m/s */
  maxSpeed: number;
  /** reverse speed as a fraction of maxSpeed */
  reverseFactor: number;
  /** seconds from 0 to maxSpeed */
  accelTime: number;
  /** degrees per second */
  hullTurnRate: number;
  /** degrees per second */
  turretTurnRate: number;
}

export type TankKind = keyof typeof tanksJson;

const CLASSES: readonly string[] = ['light', 'medium', 'heavy'];

export const TANKS: Record<TankKind, TankStats> = validate(tanksJson);

/** JSON widens `class` to string; fail at load, not mid-match, when data has a typo. */
function validate(json: typeof tanksJson): Record<TankKind, TankStats> {
  for (const [kind, stats] of Object.entries(json)) {
    if (!CLASSES.includes(stats.class))
      throw new Error(`tanks.json: ${kind}.class "${stats.class}"`);
  }
  return json as Record<TankKind, TankStats>;
}
