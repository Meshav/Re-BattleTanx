import { afterEach, expect, it, vi } from "vitest";
import { startLoop } from "./loop.ts";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("bounds catch-up work, resets on visibility changes and cancels stopped frames", () => {
  const pending = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.spyOn(performance, "now").mockReturnValue(0);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { pending.set(++id, cb); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => pending.delete(key));
  const doc = new EventTarget();
  vi.stubGlobal("document", doc);
  const step = vi.fn(), render = vi.fn();
  const stop = startLoop(1 / 30, { step, render });
  const frame = (now: number) => {
    const [key, cb] = [...pending][0]!;
    pending.delete(key);
    cb(now);
  };
  frame(16);
  expect(step).toHaveBeenCalledTimes(0);
  frame(1000); // a one-second stall must not block the next input/render for 30 ticks
  expect(step).toHaveBeenCalledTimes(2);
  expect(render).toHaveBeenCalledTimes(2);
  expect(render.mock.lastCall![0]).toBeLessThan(1);
  vi.spyOn(performance, "now").mockReturnValue(5000);
  doc.dispatchEvent(new Event("visibilitychange"));
  frame(5016);
  expect(step).toHaveBeenCalledTimes(2);
  stop();
  expect(pending.size).toBe(0);
});
