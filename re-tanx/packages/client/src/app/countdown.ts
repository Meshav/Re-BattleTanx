import launch from '../../../../data/launch.json';

/** One cancellable countdown; zero is the brief GO cue before gameplay starts. */
export function startCountdown(update: (remaining: number) => void, complete: () => void) {
  let remaining = launch.countdownSeconds;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout>;

  function tick(): void {
    if (cancelled) return;
    update(remaining);
    if (remaining === 0) {
      timer = setTimeout(() => {
        if (!cancelled) complete();
      }, launch.goDurationMs);
      return;
    }
    remaining -= 1;
    timer = setTimeout(tick, 1000);
  }

  tick();
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}
