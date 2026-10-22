import { afterEach, expect, it, vi } from 'vitest';
import { createTank, createWorld } from '@re-tanx/sim';
import { startLoop } from './loop';

afterEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

it('freezes the world while paused, resumes without catch-up, and cancels on quit', () => {
  let frame: FrameRequestCallback = () => {};
  let running = true;
  const request = vi.fn((callback: FrameRequestCallback) => {
    frame = callback;
    return 7;
  });
  const cancel = vi.fn();
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  vi.spyOn(performance, 'now').mockReturnValue(0);
  const world = createWorld();
  const tank = createTank(1, 'm1', 0, 0);
  world.tanks.push(tank);
  const readInputs = vi.fn(() => new Map([[1, { throttle: 1, steer: 0 }]]));
  const stop = startLoop(world, { isRunning: () => running, readInputs, render: vi.fn() });

  frame(100);
  expect(tank.x).toBeGreaterThan(0);
  const beforePause = structuredClone(world);
  const inputReads = readInputs.mock.calls.length;
  running = false;
  frame(60_000);
  expect(world).toEqual(beforePause);
  expect(readInputs).toHaveBeenCalledTimes(inputReads);
  running = true;
  frame(60_034);
  expect(world.tick).toBe(beforePause.tick + 1);
  expect(tank.x).toBeGreaterThan(beforePause.tanks[0]!.x);
  stop();
  expect(cancel).toHaveBeenCalledWith(7);
});
