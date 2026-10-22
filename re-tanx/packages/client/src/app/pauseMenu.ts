export interface PauseMenu { open: boolean; toggle(): void }

/** Esc / Start overlay. The sim simply doesn't step while it's open. */
export function createPauseMenu(host: HTMLElement, hooks: { onQuit(): void }, title = "Paused", quitLabel = "Quit to menu"): PauseMenu {
  const el = document.createElement("div");
  el.className = "overlay hidden";
  el.innerHTML = `<div class="card"><h2>${title}</h2>
    <button data-resume>Resume</button><button data-quit class="secondary">${quitLabel}</button>
    <p class="muted">Esc or Start to resume</p></div>`;
  host.appendChild(el);
  const menu: PauseMenu = {
    open: false,
    toggle() {
      menu.open = !menu.open;
      el.classList.toggle("hidden", !menu.open);
      if (menu.open) el.querySelector<HTMLButtonElement>("[data-resume]")!.focus();
    },
  };
  el.querySelector("[data-resume]")!.addEventListener("click", () => menu.toggle());
  el.querySelector("[data-quit]")!.addEventListener("click", () => hooks.onQuit());
  return menu;
}
