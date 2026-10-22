import { difficulties, gangDefs, gangIds, isUnlocked, levelFor, modeKinds, perkSlots, type GangId } from "@re-tanx/sim";
import { allArenas } from "./editor/customMaps.ts";
import { loadProfile } from "./profile/localProfile.ts";
import { DEVICE_LABEL, type Device, type MatchConfig } from "./matchConfig.ts";
import { MODE_LABEL } from "./modeLabels.ts";
import { esc } from "./esc.ts";
import { settings } from "../settings/settings.ts";

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
  host.innerHTML = `<div class="overlay menu"><form class="card wide start-menu" data-form>
    <header class="menu-brand"><h1 class="menu-logo"><picture>
      <source media="(max-width: 520px), (max-height: 700px)" srcset="/branding/logo-text.png" width="2117" height="743">
      <img src="/branding/logo-full.png" alt="Re-Tanx" width="1254" height="1254" fetchpriority="high" decoding="async">
    </picture></h1><p>Arcade tank combat.<br>Pick a way to play.</p></header>
    <button type="submit" class="play-now" data-start><strong>Play now</strong><span>Start a local match · no connection needed</span></button>
    <p class="match-summary" data-summary></p>
    <div class="play-choices">
      <button type="button" class="secondary" data-campaign><strong>Campaign</strong><span>Story missions · solo or 2-player co-op</span></button>
      <button type="button" class="secondary" data-online><strong>Play online</strong><span>Quick match, host or join friends</span></button>
    </div>
    <details class="menu-section"><summary>Customize local match <span>Arena, bots &amp; split-screen</span></summary><div class="menu-options">
      <label>Arena <select name="map">${allArenas().map((m) => `<option value="${m.id}"${m.id === (cfg.map ?? "graybox") ? " selected" : ""}>${esc(m.name)}${m.id.startsWith("c-") ? " (custom)" : ""}</option>`).join("")}</select></label>
      <label>Game mode <select name="mode">${opts(modeKinds, cfg.mode, (v) => MODE_LABEL[v as keyof typeof MODE_LABEL] ?? v)}</select></label>
      <div class="row">
        <label>Score limit <input name="scoreLimit" type="number" min="0" max="300" value="${cfg.scoreLimit}"></label>
        <label>Teams <select name="teams">${opts(["ffa", "coop"], cfg.teams, (v) => (v === "ffa" ? "Free-for-all" : "Players vs bots"))}</select></label>
      </div>
      <p class="muted">Score limit depends on the mode: kills, captures or time held. Use 0 for the default.</p>
      <fieldset><legend>Players on this device</legend><div data-players></div>
        <button type="button" class="secondary" data-add>+ Add split-screen player</button></fieldset>
      <div class="row">
        <label>Bot opponents <input name="bots" type="number" min="0" max="7" value="${cfg.bots}"></label>
        <label>Bot difficulty <select name="difficulty">${opts(difficulties, cfg.difficulty)}</select></label>
        <label>Perks <select name="perks"${perkSlots(level) ? "" : " disabled"}><option value="on"${cfg.perks ? " selected" : ""}>On (your loadout)</option><option value="off"${cfg.perks ? "" : " selected"}>Off (Classic)</option></select></label>
      </div>
      <button type="submit">Start local match</button>
    </div></details>
    <div class="control-guide"><b>Your controls</b><p data-controls></p></div>
    <div class="menu-utilities"><button type="button" class="secondary" data-settings>Settings &amp; controls</button><button type="button" class="secondary" data-profile>Profile · Level ${level}</button></div>
    <details class="menu-section"><summary>Replays &amp; map editor</summary><div class="menu-options">
      <button type="button" class="secondary" data-replay-last${hooks.hasReplay ? "" : " disabled"}>Watch last match</button><button type="button" class="secondary" data-replay-file>Open replay file…</button><button type="button" class="secondary" data-editor>Create or edit an arena</button>
    </div></details>
  </form></div>`;
  const form = host.querySelector<HTMLFormElement>("[data-form]")!;
  const list = host.querySelector<HTMLElement>("[data-players]")!;
  const players = cfg.players.map((p) => ({ ...p }));
  const drawPlayers = () => {
    list.innerHTML = players.map((p, i) => `<div class="row player" data-i="${i}"><b>P${i + 1}</b>
      <label>Gang <select data-gang aria-label="P${i + 1} gang">${gangOptions(p.gang)}</select></label>
      <label>Controls <select data-device aria-label="P${i + 1} controls">${opts(devices, p.device, (d) => DEVICE_LABEL[d as Device])}</select></label>
      ${players.length > 1 ? `<button type="button" class="secondary small" data-remove aria-label="Remove P${i + 1}">Remove</button>` : ""}</div>`).join("");
    host.querySelector<HTMLButtonElement>("[data-add]")!.disabled = players.length >= 4;
    summarize();
  };
  list.addEventListener("change", (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>("[data-i]");
    const p = players[Number(row?.dataset.i)];
    if (!p || !row) return;
    p.gang = row.querySelector<HTMLSelectElement>("[data-gang]")!.value as GangId;
    p.device = row.querySelector<HTMLSelectElement>("[data-device]")!.value as Device;
    summarize();
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
  function summarize(): void {
    const selected = (name: string) => form.querySelector<HTMLSelectElement>(`[name=${name}]`)!.selectedOptions[0]!.textContent;
    const bots = form.querySelector<HTMLInputElement>("[name=bots]")!.value;
    host.querySelector("[data-summary]")!.textContent = `${selected("mode")} · ${selected("map")} · ${players.length} player${players.length === 1 ? "" : "s"} + ${bots} bots`;
    const device = players[0]!.device;
    const key = (code: string) => code.replace(/^Key|^Digit/, "");
    const b = settings().bindings;
    host.querySelector("[data-controls]")!.textContent = device === "kbm"
      ? `${[b.forward, b.left, b.back, b.right].map(key).join(" / ")} drive · Mouse aim · Click / ${key(b.fire)} fire · ${key(b.special)} special · Esc pause`
      : device === "keys" ? "Arrow keys drive · Enter fire · Right Shift special · Esc pause"
      : device === "touch" ? "Left stick drive · Right stick aim · FIRE shoot · SP special"
      : "Left stick drive · Right stick aim · RT fire · LT special · Start pause";
  }
  form.addEventListener("input", summarize);
  drawPlayers();
  host.querySelector<HTMLButtonElement>("[data-start]")!.focus();
}
