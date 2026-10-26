import { aiDefs, difficulties, maxHp, pickupDefs, rules, specialDefs, tankDefs, type World } from "@re-tanx/sim";

/** Live balance tuning for local matches: edits the sim's data tables in place, so changes apply on the next tick. */
type Table = Record<string, unknown>;
const SECTIONS: Record<string, Table> = { tanks: tankDefs, specials: specialDefs, pickups: pickupDefs, ai: aiDefs, rules };
const ORIGINAL = structuredClone(SECTIONS);

export const devEnabled = (): boolean => import.meta.env.DEV || new URLSearchParams(location.search).has("dev");

export interface DevPanel { toggle(): void }

/** Every number in a table as [dotted path, parent object, key]. */
function numbers(o: Table, path = ""): [string, Table, string][] {
  return Object.entries(o).flatMap(([k, v]) => {
    const p = path ? `${path}.${k}` : k;
    if (typeof v === "number") return [[p, o, k] as [string, Table, string]];
    return v && typeof v === "object" ? numbers(v as Table, p) : [];
  });
}

const at = (o: Table, path: string): unknown => path.split(".").reduce<unknown>((x, k) => (x as Table | undefined)?.[k], o);

/** Restore a section's numbers to what shipped (arrays and strings are never edited). */
function reset(name: string): void {
  for (const [p, parent, k] of numbers(SECTIONS[name]!)) parent[k] = at(ORIGINAL[name]!, p);
}

export function createDevPanel(host: HTMLElement, world: World): DevPanel {
  const el = document.createElement("div");
  el.className = "dev-panel hidden";
  el.innerHTML = `<div class="row"><b>DEV · power scaling</b><button type="button" class="secondary small" data-close>✕</button></div>
    <div class="row"><select data-section>${Object.keys(SECTIONS).map((s) => `<option>${s}</option>`).join("")}</select><input data-filter placeholder="filter, e.g. damage"></div>
    <div class="row"><button type="button" class="small" data-heal>Refill all HP</button>
      <select data-bots><option value="">Bot difficulty…</option>${difficulties.map((d) => `<option>${d}</option>`).join("")}</select></div>
    <div class="row"><button type="button" class="secondary small" data-copy>Copy JSON</button><button type="button" class="secondary small" data-reset>Reset section</button></div>
    <p class="muted">Local matches only. HP changes apply on respawn or "Refill all HP". Reload the page to restore everything.</p>
    <div class="dev-rows" data-rows></div>`;
  host.appendChild(el);
  const $ = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel)!;
  const section = $<HTMLSelectElement>("[data-section]"), filter = $<HTMLInputElement>("[data-filter]"), rows = $("[data-rows]");

  const render = () => {
    const name = section.value, q = filter.value.toLowerCase();
    rows.innerHTML = numbers(SECTIONS[name]!).filter(([p]) => p.toLowerCase().includes(q)).map(([p, parent, k]) =>
      `<label class="${parent[k] !== at(ORIGINAL[name]!, p) ? "dev-changed" : ""}"><span>${p}</span><input type="number" step="any" value="${parent[k]}" data-path="${p}"></label>`).join("");
  };
  rows.addEventListener("change", (e) => {
    const input = e.target as HTMLInputElement, v = Number(input.value);
    const hit = numbers(SECTIONS[section.value]!).find(([p]) => p === input.dataset.path);
    if (!hit || input.value === "" || !Number.isFinite(v)) return render();
    hit[1][hit[2]] = v;
    input.closest("label")!.classList.toggle("dev-changed", v !== at(ORIGINAL[section.value]!, hit[0]));
  });
  section.addEventListener("change", render);
  filter.addEventListener("input", render);
  $("[data-heal]").addEventListener("click", () => { for (const t of world.tanks) if (t.alive) t.hp = maxHp(t); });
  $<HTMLSelectElement>("[data-bots]").addEventListener("change", (e) => {
    const d = (e.target as HTMLSelectElement).value as (typeof difficulties)[number];
    if (d) for (const b of Object.values(world.bots)) b.difficulty = d;
  });
  $("[data-copy]").addEventListener("click", () => void navigator.clipboard?.writeText(JSON.stringify(SECTIONS[section.value], null, 2)));
  $("[data-reset]").addEventListener("click", () => { reset(section.value); render(); });
  const panel: DevPanel = { toggle: () => { if (!el.classList.toggle("hidden")) render(); } };
  $("[data-close]").addEventListener("click", panel.toggle);
  return panel;
}
