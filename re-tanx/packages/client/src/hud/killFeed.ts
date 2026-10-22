import type { SimEvent, World } from "@re-tanx/sim";
import { teamLabel } from "../app/results.ts";
import { setHtml } from "./setHtml.ts";

interface Line { text: string; until: number }

/** Last few kills, each shown for a few seconds. */
export interface KillFeed { el: HTMLElement; lines: Line[]; names: (id: number) => string }

export function pushKills(feed: KillFeed, events: SimEvent[], world: World): void {
  const now = performance.now();
  for (const e of events) {
    if (e.type === "convoy") feed.lines.push({ text: `${feed.names(e.tankId)} got through!`, until: now + 5000 });
    if (e.type === "round") feed.lines.push({ text: e.winner >= 0 ? `Round ${e.round} to ${teamLabel(world, e.winner)}` : `Round ${e.round}: nobody survived`, until: now + 5000 });
    if (e.type === "bossPhase") feed.lines.push({ text: e.phase === 2 ? "⚠ The boss is enraged!" : "⚠ The boss calls for help!", until: now + 5000 });
    if (e.type !== "kill") continue;
    const self = e.victimId === e.killerId || !world.tanks.some((t) => t.id === e.killerId);
    const text = self ? `${feed.names(e.victimId)} self-destructed` : `${feed.names(e.killerId)} ✕ ${feed.names(e.victimId)}`;
    feed.lines.push({ text, until: now + 5000 });
  }
  feed.lines = feed.lines.filter((l) => l.until > now).slice(-5);
  setHtml(feed.el, feed.lines.map((l) => `<div>${l.text}</div>`).join(""));
}
