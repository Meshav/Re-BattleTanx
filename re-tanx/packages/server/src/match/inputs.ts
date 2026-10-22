import type { InputState } from "@re-tanx/sim";
import { idleInput } from "@re-tanx/sim";

const MAX_QUEUE = 6; // ~200 ms of buffered input; older ones are dropped so lag can't snowball

/** Per-player FIFO of inputs: one consumed per server tick, the last one repeats if the queue runs dry. */
export interface InputQueue { queue: { seq: number; input: InputState; view: number | undefined }[]; last: InputState; ack: number; view: number | undefined }

export const createQueue = (): InputQueue => ({ queue: [], last: idleInput(), ack: 0, view: undefined });

export function pushInput(q: InputQueue, seq: number, input: InputState, view?: number): void {
  if (seq <= q.ack || q.queue.some((e) => e.seq >= seq)) return; // stale or duplicate
  q.queue.push({ seq, input, view });
  if (q.queue.length > MAX_QUEUE) q.queue.splice(0, q.queue.length - MAX_QUEUE);
}

export function nextInput(q: InputQueue): InputState {
  const e = q.queue.shift();
  if (!e) return { ...q.last, cycle: 0 }; // repeat held controls, never a one-shot
  q.ack = e.seq;
  q.last = e.input;
  q.view = e.view;
  return e.input;
}

/** True if this client is over the message rate limit (sliding 1 s window). */
export function rateLimited(times: number[], now: number, perSecond: number): boolean {
  while (times.length && now - times[0]! > 1000) times.shift();
  times.push(now);
  return times.length > perSecond;
}
