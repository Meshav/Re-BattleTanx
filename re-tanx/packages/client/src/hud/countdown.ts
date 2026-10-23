import { rules, type World } from "@re-tanx/sim";
import { settings } from "../settings/settings.ts";

/** Pre-match count-in (doc 15 §15.2): the arena or mission title, then 3-2-1, then GO! for one beat. `el` holds a title and a digit div. */
export function renderCountdown(el: HTMLElement, world: World): void {
  const left = world.mode.countdown;
  const { beatTicks, digits } = rules.countdown;
  const beat = left ? Math.ceil(left / beatTicks) : 0;
  const go = left === 0 && world.mode.elapsed < beatTicks * world.dt;
  const digit = beat > 0 && beat <= digits ? String(beat) : go ? "GO!" : "";
  const title = left ? (world.campaign?.mission.title ?? world.map.name) : "";
  const [titleEl, digitEl] = el.children as unknown as [HTMLElement, HTMLElement];
  el.classList.toggle("hidden", !digit && !title);
  titleEl.textContent = title; // custom arena names are player-written: text only
  if (digitEl.textContent === digit) return;
  digitEl.textContent = digit;
  digitEl.classList.remove("pop");
  void digitEl.offsetWidth; // restart the CSS animation
  if (digit && !settings().reducedMotion) digitEl.classList.add("pop");
}
