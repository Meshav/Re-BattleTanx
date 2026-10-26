import type { Tank, World } from "@re-tanx/sim";
import { drawMinimap } from "../hud/minimap.ts";
import { showSettings } from "./settingsScreen.ts";

export interface PauseMenu {
  open: boolean; toggle(): void;
  /** redraws the big map while open (call every frame) */
  render(world: World, me: Tank | undefined): void;
  /** a line under the title, e.g. who paused an online match */
  note(text: string): void;
}

export interface PauseHooks { onQuit(): void; onSettingsChange?(): void; /** after every open/close (online private matches tell the server) */ onToggle?(open: boolean): void }

/** Esc / Start overlay: big map, resume, settings, quit. Local matches don't step while it's open. */
export function createPauseMenu(host: HTMLElement, hooks: PauseHooks, title = "Paused", quitLabel = "Quit to menu"): PauseMenu {
  const el = document.createElement("div");
  el.className = "overlay hidden";
  el.innerHTML = `<div class="card pause-card" data-card><div class="pause-heading"><img src="/branding/icon.png" alt="" width="726" height="504" decoding="async"><h2>${title}</h2></div>
    <p class="muted hidden" data-note></p>
    <canvas class="pause-map" data-map aria-label="Map"></canvas>
    <button data-resume>Resume</button><button data-settings class="secondary">Settings</button><button data-quit class="secondary">${quitLabel}</button>
    <p class="muted">Esc or Start to resume</p></div><div data-settings-host></div>`;
  host.appendChild(el);
  const card = el.querySelector<HTMLElement>("[data-card]")!;
  const settingsHost = el.querySelector<HTMLElement>("[data-settings-host]")!;
  const map = el.querySelector<HTMLCanvasElement>("[data-map]")!;
  const noteEl = el.querySelector<HTMLElement>("[data-note]")!;
  const closeSettings = () => { settingsHost.innerHTML = ""; card.classList.remove("hidden"); };
  const menu: PauseMenu = {
    open: false,
    toggle() {
      menu.open = !menu.open;
      el.classList.toggle("hidden", !menu.open);
      closeSettings();
      if (menu.open) el.querySelector<HTMLButtonElement>("[data-resume]")!.focus();
      else { (document.activeElement as HTMLElement | null)?.blur(); menu.note(""); }
      hooks.onToggle?.(menu.open);
    },
    render(world, me) {
      if (menu.open && !card.classList.contains("hidden")) drawMinimap(map, world, me, Math.max(120, Math.min(420, window.innerWidth - 90, window.innerHeight - 330)));
    },
    note(text) { noteEl.textContent = text; noteEl.classList.toggle("hidden", !text); },
  };
  el.querySelector("[data-resume]")!.addEventListener("click", () => menu.toggle());
  el.querySelector("[data-quit]")!.addEventListener("click", () => hooks.onQuit());
  el.querySelector("[data-settings]")!.addEventListener("click", () => {
    card.classList.add("hidden");
    showSettings(settingsHost, () => { closeSettings(); el.querySelector<HTMLButtonElement>("[data-settings]")!.focus(); }, hooks.onSettingsChange);
  });
  return menu;
}
