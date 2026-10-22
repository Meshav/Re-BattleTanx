import { afterEach, expect, it, vi } from 'vitest';
import launch from '../../../../data/launch.json';
import { startCountdown } from './countdown';

afterEach(() => vi.useRealTimers());

it('shows each countdown beat then GO, and launches exactly once after the cue', () => {
  vi.useFakeTimers();
  const update = vi.fn();
  const complete = vi.fn();
  startCountdown(update, complete);
  expect(update).toHaveBeenLastCalledWith(3);
  vi.advanceTimersByTime(1000);
  expect(update).toHaveBeenLastCalledWith(2);
  vi.advanceTimersByTime(1000);
  expect(update).toHaveBeenLastCalledWith(1);
  vi.advanceTimersByTime(1000);
  expect(update).toHaveBeenLastCalledWith(0);
  expect(complete).not.toHaveBeenCalled();
  vi.advanceTimersByTime(launch.goDurationMs);
  expect(complete).toHaveBeenCalledTimes(1);
  vi.runAllTimers();
  expect(complete).toHaveBeenCalledTimes(1);
});

it.each([1000, 3000])(
  'cancels at %i ms without a delayed launch and allows a fresh countdown',
  (elapsed) => {
    vi.useFakeTimers();
    const complete = vi.fn();
    const stop = startCountdown(vi.fn(), complete);
    vi.advanceTimersByTime(elapsed);
    stop();
    stop();
    vi.runAllTimers();
    expect(complete).not.toHaveBeenCalled();
    startCountdown(vi.fn(), complete);
    vi.advanceTimersByTime(launch.countdownSeconds * 1000 + launch.goDurationMs);
    expect(complete).toHaveBeenCalledTimes(1);
  },
);
