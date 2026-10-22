import type { SimEvent, Vec2 } from "@re-tanx/sim";
import { settings } from "../../settings/settings.ts";

export interface Shake { amount: number }

/** Explosions near the viewer add trauma; it decays every frame. */
export function addShake(s: Shake, events: SimEvent[], viewer: Vec2): void {
  if (settings().reducedMotion) return;
  for (const e of events) {
    if (e.type !== "explode") continue;
    const d = Math.hypot(e.pos.x - viewer.x, e.pos.y - viewer.y);
    s.amount = Math.min(1, s.amount + Math.max(0, (e.radius * 0.12) * (1 - d / 60)));
  }
}

export function shakeOffset(s: Shake, dt: number): { x: number; y: number } {
  s.amount = Math.max(0, s.amount - dt * 1.8);
  const m = s.amount * s.amount * 1.4;
  return { x: (Math.random() * 2 - 1) * m, y: (Math.random() * 2 - 1) * m };
}
