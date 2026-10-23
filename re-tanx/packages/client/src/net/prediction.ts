import { moveTank, type InputState, type Tank, type World } from "@re-tanx/sim";

/**
 * Client-side prediction for your own tank's movement. Inputs are applied locally right away,
 * then re-applied on top of each authoritative snapshot until the server acknowledges them.
 */
export interface Prediction { seq: number; pending: { seq: number; input: InputState }[] }

export const createPrediction = (): Prediction => ({ seq: 0, pending: [] });

export function predict(p: Prediction, world: World, me: Tank | undefined, input: InputState): number {
  p.seq++;
  p.pending.push({ seq: p.seq, input });
  if (p.pending.length > 90) p.pending.shift(); // ~3 s: server is clearly not listening; don't grow forever
  if (me?.alive && !world.mode.countdown) moveTank(world, me, input);
  return p.seq;
}

/** After a snapshot reset `me` to server state: drop acknowledged inputs, replay the rest. */
export function reconcile(p: Prediction, world: World, me: Tank | undefined, ack: number): void {
  p.pending = p.pending.filter((e) => e.seq > ack);
  if (!me?.alive || world.mode.countdown) return; // the server holds everyone still during the count-in
  for (const e of p.pending) moveTank(world, me, e.input);
}
