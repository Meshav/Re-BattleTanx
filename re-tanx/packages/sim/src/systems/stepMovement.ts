import { TANKS, type TankStats } from '../data/tanks';
import { IDLE_INPUT } from '../input';
import type { Inputs, World } from '../world';

const DEG = Math.PI / 180;

/** Doc 02 §2.1: tank-style steering, linear acceleration, no strafing. */
export function stepMovement(world: World, inputs: Inputs, dt: number): void {
  for (const tank of world.tanks) {
    const input = inputs.get(tank.id) ?? IDLE_INPUT;
    const stats = TANKS[tank.kind];

    tank.heading += input.steer * stats.hullTurnRate * DEG * dt;
    tank.speed = approach(tank.speed, targetSpeed(input.throttle, stats), accelPerSec(stats) * dt);
    tank.x += Math.cos(tank.heading) * tank.speed * dt;
    tank.y += Math.sin(tank.heading) * tank.speed * dt;
  }
}

function targetSpeed(throttle: number, stats: TankStats): number {
  const cap = throttle < 0 ? stats.maxSpeed * stats.reverseFactor : stats.maxSpeed;
  return throttle * cap;
}

/** Same rate for accelerating and braking; split them when the feel needs it. */
function accelPerSec(stats: TankStats): number {
  return stats.maxSpeed / stats.accelTime;
}

function approach(current: number, target: number, maxDelta: number): number {
  const delta = target - current;
  return Math.abs(delta) <= maxDelta ? target : current + Math.sign(delta) * maxDelta;
}
