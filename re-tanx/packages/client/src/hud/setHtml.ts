const last = new WeakMap<Element, string>();

/** HUD panels are rebuilt every frame; only touch the DOM when the markup actually changed. */
export function setHtml(el: Element, html: string): void {
  if (last.get(el) === html) return;
  last.set(el, html);
  el.innerHTML = html;
}
