import { isReplay, playReplay, type Replay } from "@re-tanx/sim";
import { runLocalWorld, type RunCtx } from "./localMatch.ts";

const KEY = "re-tanx:lastReplay";

/** Keep the most recent match. Storage can be full or blocked; then the replay just isn't kept. */
export function saveReplay(r: Replay): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    // quota / private mode
  }
}

export function loadReplay(): Replay | undefined {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return isReplay(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

export function downloadReplay(r: Replay): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(r)], { type: "application/json" }));
  a.download = `re-tanx-${r.mission?.id ?? `${r.opts.mode?.kind ?? "match"}-${r.map}`}.replay.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Ask for a .replay.json file; resolves undefined if cancelled or not a replay. */
export function pickReplayFile(): Promise<Replay | undefined> {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: ".json,application/json" });
    input.addEventListener("change", async () => {
      try {
        const v: unknown = JSON.parse((await input.files?.[0]?.text()) ?? "null");
        resolve(isReplay(v) ? v : undefined);
      } catch {
        resolve(undefined);
      }
    });
    input.click();
  });
}

/** Watch a replay with a spectator camera on the first tank. */
export function watchReplay(r: Replay, ctx: RunCtx, onDone: () => void): () => void {
  const playback = playReplay(r);
  return runLocalWorld(playback.world, ["keys"], ctx, { onOver: onDone, onQuit: onDone }, { playback });
}
