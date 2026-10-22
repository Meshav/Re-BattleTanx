import { specialKinds, superThreshold, type SpecialKind, type Tank } from "@re-tanx/sim";
import { setHtml } from "./setHtml.ts";
import { names } from "@re-tanx/sim";

export const SPECIAL_LABEL: Record<SpecialKind, string> = {
  guided: "Guided", swarm: "Swarm", mine: "Mines", nuke: "Nuke", health: "Health", laser: "Laser", plasma: "Plasma",
  turret: "Sentry", shock: "Shockwave", edge: names.rift, cloak: "Cloak", speed: "Boost", teleport: "Teleport", repair: "Repair drone",
};

/** Owned specials with counts; the selected one is highlighted, SUPER when stocked past threshold. */
export function renderSpecials(el: HTMLElement, me: Tank): void {
  const owned = specialKinds.filter((k) => (me.specials[k] ?? 0) > 0);
  if (!owned.length) {
    setHtml(el, `<span class="muted">No specials — grab a crate</span>`);
    return;
  }
  setHtml(el, owned.map((k) => {
    const n = me.specials[k] ?? 0;
    const th = superThreshold(k);
    const sup = th !== undefined && n >= th ? `<b class="super">SUPER</b>` : "";
    return `<span class="sp${k === me.selected ? " sel" : ""}">${SPECIAL_LABEL[k]} ×${n}${sup}</span>`;
  }).join(""));
}
