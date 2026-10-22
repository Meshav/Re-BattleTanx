import { checkMap, EDITOR_TILES, MAP_LIMITS, type MapJson } from "@re-tanx/sim";
import { esc } from "../esc.ts";
import { decodeMapCode, encodeMapCode } from "./mapCode.ts";
import { deleteCustomMap, loadCustomMaps, saveCustomMap } from "./customMaps.ts";
import { teamCss } from "../../render/teamColors.ts";
import { names } from "@re-tanx/sim";

/** Palette: what each tile is and how the editor draws it. Pickup letters match the map format (doc 08). */
const TILES: Record<string, { label: string; color: string }> = {
  ".": { label: "Ground", color: "#3b3f45" }, "#": { label: "Building", color: "#9c8f7a" }, w: { label: "Wall (breakable)", color: "#6b5d4a" },
  "~": { label: "Water (hovers only)", color: "#2f6fa3" }, S: { label: "Spawn", color: "#e8e8e8" },
  a: { label: "Fortress 1", color: teamCss(0) }, b: { label: "Fortress 2", color: teamCss(1) }, c: { label: "Fortress 3", color: teamCss(2) }, d: { label: "Fortress 4", color: teamCss(3) },
  H: { label: "Health", color: "#5fd35f" }, D: { label: "Shield", color: "#6fb7ff" }, A: { label: "Ammo", color: "#d9c36a" }, G: { label: "Guided missile", color: "#ffb340" },
  R: { label: "Swarm rockets", color: "#ffb340" }, M: { label: "Mines", color: "#ffb340" }, N: { label: "Nuke", color: "#ff5a3c" }, L: { label: "Laser", color: "#ffb340" },
  P: { label: "Plasma", color: "#ffb340" }, U: { label: "Sentry turret", color: "#ffb340" }, K: { label: "Shockwave", color: "#ffb340" }, V: { label: "Cloak", color: "#ffb340" },
  F: { label: "Speed", color: "#ffb340" }, J: { label: "Teleport", color: "#ffb340" }, Y: { label: "Repair", color: "#5fd35f" }, Z: { label: names.rift, color: "#c86bff" },
  "*": { label: "Random special", color: "#ffb340" }, $: { label: "Bucks", color: "#7be07b" },
};

export function blankMap(cols = 28, rows = 16): MapJson {
  const r = Array.from({ length: rows }, (_, y) => (y === 0 || y === rows - 1 ? "#".repeat(cols) : `#${".".repeat(cols - 2)}#`));
  r[1] = `#S${".".repeat(cols - 4)}S#`;
  r[rows - 2] = `#S${".".repeat(cols - 4)}S#`;
  return { id: "", name: "My arena", cell: 10, rows: r };
}

export interface EditorHooks { onBack(): void; onTest(map: MapJson): void }

/** Paint an arena on a grid, check it, test-drive it, save it, share it as a code. */
export function showMapEditor(host: HTMLElement, start: MapJson, hooks: EditorHooks): void {
  let grid = start.rows.map((r) => [...r]);
  let name = start.name;
  let brush = "#";
  host.innerHTML = `<div class="overlay menu editor"><div class="card wide">
    <h1>MAP EDITOR</h1>
    <div class="row">
      <label>Name <input name="name" maxlength="${MAP_LIMITS.maxName}" value="${esc(name)}"></label>
      <label>Width <input name="cols" type="number" min="${MAP_LIMITS.minCols}" max="${MAP_LIMITS.maxCols}" value="${grid[0]!.length}"></label>
      <label>Height <input name="rows" type="number" min="${MAP_LIMITS.minRows}" max="${MAP_LIMITS.maxRows}" value="${grid.length}"></label>
    </div>
    <div class="palette" role="radiogroup" aria-label="Tiles">${[...EDITOR_TILES].map((ch) => `<button type="button" class="secondary small tile" data-tile="${esc(ch)}" title="${TILES[ch]!.label}" aria-label="${TILES[ch]!.label}"><i style="background:${TILES[ch]!.color}"></i>${ch === "." ? "␣" : esc(ch)}</button>`).join("")}</div>
    <p class="muted small" data-brush></p>
    <canvas data-canvas aria-label="Map grid: click or drag to paint, right-click to erase"></canvas>
    <ul class="problems" data-problems></ul>
    <div class="row">
      <button type="button" data-test>Test drive</button>
      <button type="button" class="secondary" data-save>Save</button>
      <button type="button" class="secondary" data-share>Share code</button>
      <button type="button" class="secondary" data-back>Back</button>
    </div>
    <div class="row"><label>Map code <input name="code" placeholder="paste a code to load it"></label><button type="button" class="secondary small" data-load-code>Load</button></div>
    <p class="muted small" data-status role="status"></p>
    <h3>Your arenas</h3><ul class="mymaps" data-mymaps></ul>
  </div></div>`;
  const $ = <T extends Element>(sel: string) => host.querySelector<T>(sel)!;
  const canvas = $<HTMLCanvasElement>("[data-canvas]");
  const g = canvas.getContext("2d")!;
  const status = (msg: string) => ($("[data-status]").textContent = msg);
  const current = (): MapJson => ({ id: "", name, cell: 10, rows: grid.map((r) => r.join("")) });

  function draw(): void {
    const cols = grid[0]!.length, rows = grid.length;
    const size = Math.max(8, Math.floor(Math.min(820, host.clientWidth - 64) / cols));
    canvas.width = cols * size;
    canvas.height = rows * size;
    g.font = `bold ${Math.floor(size * 0.6)}px monospace`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    grid.forEach((row, y) => row.forEach((ch, x) => {
      g.fillStyle = TILES[ch]?.color ?? "#000";
      g.fillRect(x * size, y * size, size - 1, size - 1);
      if (!".#w~".includes(ch)) {
        g.fillStyle = "#111";
        g.fillText(ch, x * size + size / 2, y * size + size / 2 + 1);
      }
    }));
    const { problems } = checkMap(current());
    $("[data-problems]").innerHTML = problems.map((p) => `<li>${esc(p)}</li>`).join("");
    $<HTMLButtonElement>("[data-test]").disabled = problems.length > 0;
    $<HTMLButtonElement>("[data-share]").disabled = problems.length > 0;
    $("[data-brush]").textContent = `Painting: ${TILES[brush]!.label} — pick ␣ or right-click to erase`;
    host.querySelectorAll<HTMLButtonElement>("[data-tile]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tile === brush)));
  }

  function listMine(): void {
    const mine = loadCustomMaps();
    $("[data-mymaps]").innerHTML = mine.length ? mine.map((m) => `<li><b>${esc(m.name)}</b> <span class="muted small">${m.rows[0]!.length}×${m.rows.length}</span>
      <button type="button" class="secondary small" data-open="${m.id}">Edit</button><button type="button" class="secondary small" data-del="${m.id}">Delete</button></li>`).join("")
      : `<li class="muted">None yet. Saved arenas show up in the Arena list for local and online matches.</li>`;
    host.querySelectorAll<HTMLButtonElement>("[data-open]").forEach((b) => b.addEventListener("click", () => load(mine.find((m) => m.id === b.dataset.open)!)));
    host.querySelectorAll<HTMLButtonElement>("[data-del]").forEach((b) => b.addEventListener("click", () => {
      deleteCustomMap(b.dataset.del!);
      listMine();
    }));
  }

  function load(m: MapJson): void {
    grid = m.rows.map((r) => [...r]);
    name = m.name;
    $<HTMLInputElement>("[name=name]").value = name;
    $<HTMLInputElement>("[name=cols]").value = String(grid[0]!.length);
    $<HTMLInputElement>("[name=rows]").value = String(grid.length);
    draw();
  }

  function resize(): void {
    const cols = Math.min(MAP_LIMITS.maxCols, Math.max(MAP_LIMITS.minCols, Number($<HTMLInputElement>("[name=cols]").value) || 0));
    const rows = Math.min(MAP_LIMITS.maxRows, Math.max(MAP_LIMITS.minRows, Number($<HTMLInputElement>("[name=rows]").value) || 0));
    const fresh = blankMap(cols, rows).rows.map((r) => [...r]);
    // keep what was painted inside the new bounds (minus the old border)
    grid.forEach((row, y) => row.forEach((ch, x) => {
      if (y > 0 && x > 0 && y < rows - 1 && x < cols - 1 && y < grid.length - 1 && x < row.length - 1) fresh[y]![x] = ch;
    }));
    grid = fresh;
    draw();
  }

  function saved(): MapJson | undefined {
    const { map, problems } = checkMap(current());
    if (!map) return void status(problems.join(" · "));
    if (!saveCustomMap(map)) status("Couldn't save: browser storage is full or blocked");
    listMine();
    return map;
  }

  let painting: string | undefined;
  const cellAt = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const size = r.width / grid[0]!.length;
    return { x: Math.floor((e.clientX - r.left) / size), y: Math.floor((e.clientY - r.top) / size) };
  };
  const paint = (e: PointerEvent) => {
    const { x, y } = cellAt(e);
    if (painting === undefined || !grid[y]?.[x] || grid[y]![x] === painting) return;
    // fortresses and only-one tiles move instead of multiplying
    if ("abcd".includes(painting)) grid.forEach((row) => row.forEach((ch, i) => ch === painting && (row[i] = ".")));
    grid[y]![x] = painting;
    draw();
  };
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    painting = e.button === 2 ? "." : brush;
    canvas.setPointerCapture(e.pointerId);
    paint(e);
  });
  canvas.addEventListener("pointermove", paint);
  canvas.addEventListener("pointerup", () => (painting = undefined));
  host.querySelectorAll<HTMLButtonElement>("[data-tile]").forEach((b) => b.addEventListener("click", () => {
    brush = b.dataset.tile!;
    draw();
  }));
  $<HTMLInputElement>("[name=name]").addEventListener("input", (e) => (name = (e.target as HTMLInputElement).value));
  $("[name=cols]").addEventListener("change", resize);
  $("[name=rows]").addEventListener("change", resize);
  $("[data-save]").addEventListener("click", () => saved() && status(`Saved "${name}". It's in the Arena list now.`));
  $("[data-test]").addEventListener("click", () => {
    const m = saved();
    if (m) hooks.onTest(m);
  });
  $("[data-share]").addEventListener("click", () => {
    const m = saved();
    if (!m) return;
    const code = encodeMapCode(m);
    const link = `${location.origin}${location.pathname}?map=${code}`;
    $<HTMLInputElement>("[name=code]").value = code;
    void navigator.clipboard?.writeText(link).then(() => status("Link copied — anyone who opens it gets this arena in their editor."), () => status(`Share this link: ${link}`));
  });
  $("[data-load-code]").addEventListener("click", () => {
    const { map, problems } = decodeMapCode($<HTMLInputElement>("[name=code]").value);
    if (map) load(map);
    status(map ? `Loaded "${map.name}"` : problems.join(" · "));
  });
  $("[data-back]").addEventListener("click", hooks.onBack);
  draw();
  listMine();
}
