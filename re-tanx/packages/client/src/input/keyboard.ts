/** Live set of held keys by KeyboardEvent.code, plus one-shot presses for toggles. */
export interface Keyboard { held: Set<string>; pressed: Set<string> }

export function createKeyboard(target: Window): Keyboard {
  const kb: Keyboard = { held: new Set(), pressed: new Set() };
  target.addEventListener("keydown", (e) => {
    // Menus keep native Tab/Space navigation and never leave driving keys latched.
    const ui = e.target instanceof Element && e.target.closest("input, select, textarea, button, summary, [contenteditable]");
    if (ui && e.code !== "Escape") return;
    if (!e.repeat) kb.pressed.add(e.code);
    kb.held.add(e.code);
    if (e.code === "Space" || e.code === "Tab") e.preventDefault();
  });
  target.addEventListener("keyup", (e) => kb.held.delete(e.code));
  target.addEventListener("blur", () => { kb.held.clear(); kb.pressed.clear(); });
  return kb;
}

/** Read-and-clear a one-shot press. */
export function consumePress(kb: Keyboard, code: string): boolean {
  return kb.pressed.delete(code);
}

export const axis = (kb: Keyboard, neg: string[], pos: string[]): number =>
  (pos.some((k) => kb.held.has(k)) ? 1 : 0) - (neg.some((k) => kb.held.has(k)) ? 1 : 0);
