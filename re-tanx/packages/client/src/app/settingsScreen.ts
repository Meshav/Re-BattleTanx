import { DEFAULT_BINDINGS, saveSettings, settings, type Action } from "../settings/settings.ts";

const LABEL: Record<Action, string> = { forward: "Forward", back: "Reverse", left: "Turn left / strafe", right: "Turn right / strafe", fire: "Fire (also left click)", special: "Special (also right click)", prev: "Previous special", next: "Next special", camera: "Camera" };
const keyName = (code: string) => code.replace(/^Key/, "").replace(/^Digit/, "");

/** Sound, graphics, accessibility and key bindings. */
export function showSettings(host: HTMLElement, onBack: () => void, onChange?: () => void): void {
  const s = settings();
  host.innerHTML = `<div class="overlay menu"><form class="card wide" data-form>
    <h1>SETTINGS</h1>
    <label>Sound effects <input type="range" name="volume" min="0" max="1" step="0.05" value="${s.volume}"></label>
    <label>Music <input type="range" name="musicVolume" min="0" max="1" step="0.05" value="${s.musicVolume}"></label>
    <label>Graphics <select name="quality"><option value="low"${s.quality === "low" ? " selected" : ""}>Performance — fastest response (recommended)</option><option value="high"${s.quality === "high" ? " selected" : ""}>High detail — shadows and antialiasing</option></select><span class="muted">Changing graphics reloads the game when you press Done.</span></label>
    <label class="check"><input type="checkbox" name="colorblind"${s.colorblind ? " checked" : ""}> Colour-blind safe team colours</label>
    <label class="check"><input type="checkbox" name="reducedMotion"${s.reducedMotion ? " checked" : ""}> Reduce motion (no screen shake or flashes)</label>
    <h3>Keyboard</h3><div class="binds">${(Object.keys(LABEL) as Action[]).map((a) => `<span>${LABEL[a]}</span><button type="button" class="secondary small" data-bind="${a}">${keyName(s.bindings[a])}</button>`).join("")}</div>
    <div class="row"><button type="button" class="secondary small" data-reset>Reset keys</button><button type="button" data-back>Done</button></div>
  </form></div>`;
  const form = host.querySelector<HTMLFormElement>("[data-form]")!;
  const quality = s.quality;
  form.addEventListener("change", () => {
    const f = new FormData(form);
    saveSettings({ ...settings(), volume: Number(f.get("volume")), musicVolume: Number(f.get("musicVolume")), quality: f.get("quality") === "low" ? "low" : "high", colorblind: f.has("colorblind"), reducedMotion: f.has("reducedMotion") });
    onChange?.();
  });
  form.querySelectorAll<HTMLButtonElement>("[data-bind]").forEach((b) => b.addEventListener("click", () => capture(b)));
  host.querySelector("[data-reset]")!.addEventListener("click", () => {
    saveSettings({ ...settings(), bindings: { ...DEFAULT_BINDINGS } });
    showSettings(host, onBack, onChange);
  });
  host.querySelector("[data-back]")!.addEventListener("click", () => (settings().quality !== quality ? location.reload() : onBack()));
}

/** Next key pressed becomes the binding (Esc cancels). */
function capture(btn: HTMLButtonElement): void {
  const action = btn.dataset.bind as Action;
  btn.textContent = "press a key…";
  const onKey = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation(); // the bound key (or Esc) must not also reach the game, e.g. closing the pause menu
    window.removeEventListener("keydown", onKey, true);
    if (e.code !== "Escape") saveSettings({ ...settings(), bindings: { ...settings().bindings, [action]: e.code } });
    btn.textContent = keyName(settings().bindings[action]);
  };
  window.addEventListener("keydown", onKey, true);
}
