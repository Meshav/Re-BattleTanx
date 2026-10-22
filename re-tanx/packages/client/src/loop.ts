export interface LoopHooks { step(): void; render(alpha: number, frameDt: number): void }

const MAX_FRAME = 0.25; // seconds; avoids a death spiral after a background tab resumes

/** Fixed-timestep simulation with render interpolation. Returns a stop function. */
export function startLoop(tickDt: number, hooks: LoopHooks): () => void {
  let acc = 0;
  let running = true;
  let last = performance.now();
  const frame = (now: number) => {
    if (!running) return;
    const frameDt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    acc += frameDt;
    while (acc >= tickDt) {
      hooks.step();
      acc -= tickDt;
    }
    hooks.render(acc / tickDt, frameDt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return () => {
    running = false;
  };
}
