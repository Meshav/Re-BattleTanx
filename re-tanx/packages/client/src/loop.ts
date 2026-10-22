export interface LoopHooks { step(): void; render(alpha: number, frameDt: number): void }

const MAX_STEPS = 2; // Yield to input/rendering instead of compounding a stalled frame.

/** Fixed-timestep simulation with render interpolation. Returns a stop function. */
export function startLoop(tickDt: number, hooks: LoopHooks): () => void {
  let acc = 0;
  let running = true;
  let last = performance.now();
  const frame = (now: number) => {
    if (!running) return;
    const frameDt = Math.max(0, Math.min(tickDt * MAX_STEPS, (now - last) / 1000));
    last = now;
    acc += frameDt;
    while (acc >= tickDt) {
      hooks.step();
      acc -= tickDt;
    }
    hooks.render(acc / tickDt, frameDt);
    if (running) frameId = requestAnimationFrame(frame);
  };
  let frameId = requestAnimationFrame(frame);
  const reset = () => { acc = 0; last = performance.now(); };
  document.addEventListener("visibilitychange", reset);
  return () => {
    running = false;
    cancelAnimationFrame(frameId);
    document.removeEventListener("visibilitychange", reset);
  };
}
