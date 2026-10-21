import { describe, expect, it } from 'vitest';
import { TANKS } from '../data/tanks';
import { createTank } from '../entities/tank';
import type { InputState } from '../input';
import { createWorld, TICK_DT, TICK_RATE, type World } from '../world';
import { stepMovement } from './stepMovement';

function worldWithM1(): World {
  const world = createWorld();
  world.tanks.push(createTank(1, 'm1', 0, 0));
  return world;
}

function run(world: World, input: InputState | undefined, seconds: number): void {
  const inputs = input ? new Map([[1, input]]) : new Map();
  const ticks = Math.round(seconds * TICK_RATE);
  for (let i = 0; i < ticks; i++) stepMovement(world, inputs, TICK_DT);
}

describe('stepMovement', () => {
  it('reaches max forward speed after accelTime and no sooner', () => {
    const world = worldWithM1();
    const { maxSpeed, accelTime } = TANKS.m1;

    run(world, { throttle: 1, steer: 0 }, accelTime / 2);
    expect(world.tanks[0]!.speed).toBeCloseTo(maxSpeed / 2, 1);

    run(world, { throttle: 1, steer: 0 }, accelTime);
    expect(world.tanks[0]!.speed).toBe(maxSpeed);
  });

  it('caps reverse at reverseFactor × maxSpeed', () => {
    const world = worldWithM1();
    run(world, { throttle: -1, steer: 0 }, 5);
    expect(world.tanks[0]!.speed).toBeCloseTo(-TANKS.m1.maxSpeed * TANKS.m1.reverseFactor, 5);
  });

  it('turns in place at hullTurnRate without moving', () => {
    const world = worldWithM1();
    run(world, { throttle: 0, steer: 1 }, 1);
    const tank = world.tanks[0]!;
    expect(tank.heading).toBeCloseTo((TANKS.m1.hullTurnRate * Math.PI) / 180, 3);
    expect(tank.x).toBe(0);
    expect(tank.y).toBe(0);
  });

  it('coasts to a stop with no input', () => {
    const world = worldWithM1();
    run(world, { throttle: 1, steer: 0 }, 2);
    const xBefore = world.tanks[0]!.x;
    run(world, undefined, 10);
    expect(world.tanks[0]!.speed).toBe(0);
    expect(world.tanks[0]!.x).toBeGreaterThan(xBefore);
  });
});
