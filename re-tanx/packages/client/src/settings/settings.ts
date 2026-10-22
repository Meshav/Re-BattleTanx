/** Player preferences (this browser). Read anywhere; written by the settings screen. */
export type Action = "forward" | "back" | "left" | "right" | "fire" | "special" | "prev" | "next" | "camera";

export interface Settings {
  volume: number; // sound effects, 0..1
  musicVolume: number; // 0..1
  quality: "high" | "low";
  colorblind: boolean;
  reducedMotion: boolean;
  bindings: Record<Action, string>;
}

export const DEFAULT_BINDINGS: Record<Action, string> = {
  forward: "KeyW", back: "KeyS", left: "KeyA", right: "KeyD", fire: "Space", special: "KeyF", prev: "KeyQ", next: "KeyE", camera: "KeyV",
};

const KEY = "re-tanx:settings";
const prefersReduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const defaults = (): Settings => ({ volume: 0.8, musicVolume: 0.6, quality: "low", colorblind: false, reducedMotion: prefersReduced(), bindings: { ...DEFAULT_BINDINGS } });

let current: Settings | undefined;

export function settings(): Settings {
  if (current) return current;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Settings> | null;
    const d = defaults();
    current = raw ? { ...d, ...raw, volume: clamp01(raw.volume ?? d.volume), musicVolume: clamp01(raw.musicVolume ?? d.musicVolume), bindings: { ...d.bindings, ...(raw.bindings ?? {}) } } : d;
  } catch {
    current = defaults();
  }
  return current;
}

export function saveSettings(s: Settings): void {
  current = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage blocked: settings last this session
  }
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.8);
