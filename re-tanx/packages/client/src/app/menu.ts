import { difficulties, gangDefs, gangIds, isUnlocked, levelFor, modeKinds, perkSlots, type GangId } from "@re-tanx/sim";
import { allArenas } from "./editor/customMaps.ts";
import { loadProfile } from "./profile/localProfile.ts";
import { DEVICE_LABEL, type Device, type MatchConfig } from "./matchConfig.ts";
import { MODE_LABEL } from "./modeLabels.ts";
import { esc } from "./esc.ts";
import { names } from "@re-tanx/sim";

const devices = Object.keys(DEVICE_LABEL) as Device[];
const opts = (values: readonly string[], selected: string, label: (v: string) => string = (v) => v) =>
  values.map((v) => `<option value="${v}"${v === selected ? " selected" : ""}>${label(v)}</option>`).join("");

/** Match setup screen. Calls onStart with the chosen config. */
export interface MenuHooks { onStart(cfg: MatchConfig): void; onOnline(): void; onCampaign(): void; onProfile(): void; onSettings(): void; onReplay(source: "last" | "file"): void; hasReplay: boolean; onEditor(): void }

export function showMenu(host: HTMLElement, cfg: MatchConfig, hooks: MenuHooks): void {
  const level = levelFor(loadProfile().xp).level;
  const gangOptions = (sel: string) => gangIds.map((g) => {
    const ok = isUnlocked(level, `gang:${g}`);
    return `<option value="${g}"${g === sel ? " selected" : ""}${ok ? "" : " disabled"}>${gangDefs[g].name}${ok ? "" : " 🔒"}</option>`;
  }).join("");
  host.innerHTML = `<div class="overlay menu"><form class="card wide" data-form>
    <h1>RE-TANX</h1><p class="muted">Arcade tank combat. Wreck everything.</p>
    <div class="row"><button type="button" data-campaign style="flex:2">Campaign — Acts I &amp; II</button><button type="button" class="secondary" data-profile style="flex:1">Profile · Lv ${level}</button><button type="button" class="secondary" data-settings aria-label="Settings">⚙</button></div>
    <h3>Versus</h3>
    <label>Arena <select name="map">${allArenas().map((m) => `<option value="${m.id}"${m.id === (cfg.map ?? "graybox") ? " selected" : ""}>${esc(m.name)}${m.id.startsWith("c-") ? " ✎" : ""}</option>`).join("")}</select></label>
    <label>Mode <select name="mode">${opts(modeKinds, cfg.mode, (v) => MODE_LABEL[v as keyof typeof MODE_LABEL] ?? v)}</select></label>
    <div class="row">
      <label>Score limit <input name="scoreLimit" type="number" min="0" max="300" value="${cfg.scoreLimit}"></label>
      <label>Teams <select name="teams">${opts(["ffa", "coop"], cfg.teams, (v) => (v === "ffa" ? "Free-for-all" : "Humans vs bots"))}</select></label>
    </div>
    <fieldset><legend>Local players</legend><div data-players></div>
      <button type="button" class="secondary small" data-add>+ Add player</button></fieldset>
    <div class="row">
      <label>Bots <input name="bots" type="number" min="0" max="7" value="${cfg.bots}"></label>
      <label>Bot skill <select name="difficulty">${opts(difficulties, cfg.difficulty)}</select></label>
      <label>Perks <select name="perks"${perkSlots(level) ? "" : " disabled"}><option value="on"${cfg.perks ? " selected" : ""}>On (your loadout)</option><option value="off"${cfg.perks ? "" : " selected"}>Off (Classic)</option></select></label>
    </div>
    <div class="row"><button type="submit" data-start style="flex:2">Deploy</button><button type="button" class="secondary" data-online style="flex:1">Play online</button></div>
    <div class="row"><button type="button" class="secondary small" data-replay-last${hooks.hasReplay ? "" : " disabled"}>▶ Watch last match</button><button type="button" class="secondary small" data-replay-file>Open replay file…</button><button type="button" class="secondary small" data-editor>Map editor</button></div>
    <p class="muted small">Score limit: kills, deliveries or seconds held (0 = mode default). ${names.queen.one} modes split players across the map's fortresses.<br>Split-screen: one keyboard+mouse, one arrow-key player, and up to four gamepads.</p>
  </form></div>`;
  const form = host.querySelector<HTMLFormElement>("[data-form]")!;
  const list = host.querySelector<HTMLElement>("[data-players]")!;
  const players = cfg.players.map((p) => ({ ...p }));
  const drawPlayers = () => {
    list.innerHTML = players.map((p, i) => `<div class="row player" data-i="${i}"><b>P${i + 1}</b>
      <select data-gang aria-label="P${i + 1} gang">${gangOptions(p.gang)}</select>
      <select data-device aria-label="P${i + 1} controls">${opts(devices, p.device, (d) => DEVICE_LABEL[d as Device])}</select>
      ${players.length > 1 ? `<button type="button" class="secondary small" data-remove aria-label="Remove P${i + 1}">✕</button>` : ""}</div>`).join("");
    host.querySelector<HTMLButtonElement>("[data-add]")!.disabled = players.length >= 4;
  };
  list.addEventListener("change", (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>("[data-i]");
    const p = players[Number(row?.dataset.i)];
    if (!p || !row) return;
    p.gang = row.querySelector<HTMLSelectElement>("[data-gang]")!.value as GangId;
    p.device = row.querySelector<HTMLSelectElement>("[data-device]")!.value as Device;
  });
  list.addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).matches("[data-remove]")) return;
    players.splice(Number((e.target as HTMLElement).closest<HTMLElement>("[data-i]")!.dataset.i), 1);
    drawPlayers();
  });
  host.querySelector("[data-add]")!.addEventListener("click", () => {
    const used = new Set(players.map((p) => p.device));
    const open = gangIds.filter((g) => isUnlocked(level, `gang:${g}`));
    players.push({ gang: open[players.length % open.length]!, device: devices.find((d) => !used.has(d)) ?? "pad0" });
    drawPlayers();
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const num = (k: string, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number(f.get(k)) || lo));
    const limit = Number(f.get("scoreLimit")) || 0;
    hooks.onStart({
      mode: f.get("mode") as MatchConfig["mode"], scoreLimit: Math.min(300, Math.max(0, limit)), teams: f.get("teams") as MatchConfig["teams"],
      players, bots: num("bots", 0, 7), difficulty: f.get("difficulty") as MatchConfig["difficulty"], perks: f.get("perks") === "on", map: String(f.get("map")),
    });
  });
  host.querySelector("[data-online]")!.addEventListener("click", hooks.onOnline);
  // limits mean different things per mode (kills, points, waves): back to the mode default
  form.querySelector<HTMLSelectElement>("[name=mode]")!.addEventListener("change", () => {
    form.querySelector<HTMLInputElement>("[name=scoreLimit]")!.value = "0";
  });
  host.querySelector("[data-campaign]")!.addEventListener("click", hooks.onCampaign);
  host.querySelector("[data-profile]")!.addEventListener("click", hooks.onProfile);
  host.querySelector("[data-settings]")!.addEventListener("click", hooks.onSettings);
  host.querySelector("[data-replay-last]")!.addEventListener("click", () => hooks.onReplay("last"));
  host.querySelector("[data-replay-file]")!.addEventListener("click", () => hooks.onReplay("file"));
  host.querySelector("[data-editor]")!.addEventListener("click", hooks.onEditor);
  drawPlayers();
  host.querySelector<HTMLButtonElement>("[data-start]")!.focus();
}
