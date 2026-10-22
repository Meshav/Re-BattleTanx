import type { InputState } from "@re-tanx/sim";
import { idleInput } from "@re-tanx/sim";

const MAX_QUEUE = 6; // Bound burst storage; nextInput consumes the entire burst in one tick.

/** Latest movement wins; taps in a burst survive without queuing stale movement for later ticks. */
export interface InputQueue { queue: { seq: number; input: InputState; view: number | undefined }[]; last: InputState; ack: number; view: number | undefined }

export const createQueue = (): InputQueue => ({ queue: [], last: idleInput(), ack: 0, view: undefined });

export function pushInput(q: InputQueue, seq: number, input: InputState, view?: number): void {
  if (seq <= q.ack || q.queue.some((e) => e.seq >= seq)) return; // stale or duplicate
  q.queue.push({ seq, input, view });
  if (q.queue.length > MAX_QUEUE) q.queue.splice(0, q.queue.length - MAX_QUEUE);
}

export function nextInput(q: InputQueue): InputState {
  const e = q.queue.at(-1);
  if (!e) return { ...q.last, cycle: 0 }; // repeat held controls, never a one-shot
  const input = { ...e.input };
  q.view = e.view;
  for (const queued of q.queue) {
    input.fire ||= queued.input.fire;
    input.special ||= queued.input.special;
    if (queued.input.cycle) input.cycle = queued.input.cycle;
    if (queued.input.fire || queued.input.special) q.view = queued.view;
  }
  q.ack = e.seq;
  q.last = e.input;
  q.queue.length = 0;
  return input;
}

/** True if this client is over the message rate limit (sliding 1 s window). */
export function rateLimited(times: number[], now: number, perSecond: number): boolean {
  while (times.length && now - times[0]! > 1000) times.shift();
  times.push(now);
  return times.length > perSecond;
}
