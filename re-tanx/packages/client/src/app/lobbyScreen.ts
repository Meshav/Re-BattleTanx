import { campaignMissions, deployCost, difficulties, gangDefs, missionById, modeKinds, names, tankKinds, tankName, versusMaps, type LobbySettings, type ServerMsg, type TankKind } from "@re-tanx/sim";
import { loadProgress } from "./campaign/progress.ts";
import { MODE_SHORT } from "./modeLabels.ts";
import { allArenas, customMap } from "./editor/customMaps.ts";
import { esc } from "./esc.ts";

type LobbyMsg = Extract<ServerMsg, { t: "lobby" }>;
const opt = (vals: readonly string[], sel: string, label = (v: string) => v) => vals.map((v) => `<option value="${v}"${v === sel ? " selected" : ""}>${label(v)}</option>`).join("");

/** Waiting room: share the code, host tweaks settings and starts. Campaign co-op: host picks a mission they've reached, everyone their opening tank. */
export function showLobby(host: HTMLElement, lobby: LobbyMsg, myId: number, hooks: { onSettings(s: LobbySettings): void; onStart(): void; onLeave(): void; onTank(k: TankKind): void }): void {
  const isHost = lobby.members.find((m) => m.id === myId)?.host ?? false;
  // the host offers their own arenas; guests see whatever custom arena the host picked
  const arenas = isHost ? allArenas() : [...versusMaps, ...(lobby.settings.customMap ? [lobby.settings.customMap] : [])];
  const s = lobby.settings;
  const link = `${location.origin}${location.pathname}?join=${lobby.code}`;
  const dis = isHost ? "" : " disabled";
  const fixed = s.ranked ? " disabled" : dis; // ranked pins these
  const coop = s.mode === "campaign";
  const reached = campaignMissions.slice(0, loadProgress().unlocked + 1); // shortcut: trusts the host's local campaign progress
  const me = lobby.members.find((m) => m.id === myId);
  const versus = coop ? "" : `<label>Arena <select name="map"${dis}>${arenas.map((m) => `<option value="${m.id}"${m.id === s.map ? " selected" : ""}>${esc(m.name)}${m.id.startsWith("c-") ? " ✎" : ""}</option>`).join("")}</select></label>`;
  const missionRow = !coop ? "" : `<label>Mission <select name="mission"${dis}>${(isHost ? reached : [missionById(s.mission ?? "")!]).map((m) => `<option value="${m.id}"${m.id === s.mission ? " selected" : ""}>${m.title}</option>`).join("")}</select></label>
    <label>Your opening tank <select name="tank">${tankKinds.map((k) => `<option value="${k}"${k === (me?.tank ?? "m1") ? " selected" : ""}>${tankName(k)} · ${deployCost(s, k)}</option>`).join("")}</select></label>
    <p class="muted small">Shared wallet, everyone's own loadout and XP; your wingmen carry the host's ${names.queen.many}.</p>`;
  host.innerHTML = `<div class="overlay menu"><form class="card wide" data-form>
    <h1>LOBBY <span class="code">${lobby.code}</span></h1>
    <p class="muted small">Share the code or <a href="${link}" data-copy>copy invite link</a>.</p>
    <ul class="members">${lobby.members.map((m) => `<li>${m.host ? "★ " : ""}${m.name} <span class="muted">${coop ? tankName(m.tank ?? "m1") : gangDefs[m.gang].name}</span>${m.id === myId ? " (you)" : ""}</li>`).join("")}</ul>
    ${versus}
    <div class="row">
      <label>Mode <select name="mode"${dis}>${opt([...modeKinds, "campaign"], s.mode, (v) => (v === "campaign" ? "Campaign co-op" : MODE_SHORT[v as keyof typeof MODE_SHORT]))}</select></label>
      ${coop ? "" : `<label>Score limit <input name="scoreLimit" type="number" min="0" max="300" value="${s.scoreLimit}"${dis} title="0 = mode default"></label>`}
    </div>
    ${missionRow}
    ${coop ? "" : `<div class="row">
      <label>Bots <input name="bots" type="number" min="0" max="7" value="${s.bots}"${fixed}></label>
      <label>Bot skill <select name="difficulty"${fixed}>${opt(difficulties, s.difficulty)}</select></label>
      <label>Teams <select name="teams"${fixed}>${opt(["ffa", "coop"], s.teams, (v) => (v === "ffa" ? "Free-for-all" : "Humans vs bots"))}</select></label>
      <label>Upgrades <select name="perks"${fixed}>${opt(["on", "off"], s.perks ? "on" : "off", (v) => (v === "on" ? "On (perks + weapon levels)" : "Off (Arcade, fair)"))}</select></label>
    </div>`}
    ${coop ? `<label>Difficulty <select name="difficulty"${dis}>${opt(difficulties, s.difficulty)}</select></label>` : ""}
    ${coop ? "" : `<label class="check"><input type="checkbox" name="public"${s.public ? " checked" : ""}${dis}> Public — quick match can drop players in; starts by itself</label>`}
    ${lobby.startsIn !== undefined ? `<p class="starts" data-starts="${lobby.startsIn}">Starting in <b>${lobby.startsIn}</b>s</p>` : ""}
    ${coop ? "" : `<label class="check"><input type="checkbox" name="ranked"${s.ranked ? " checked" : ""}${dis}> Ranked — humans only, free-for-all, Arcade (no perks or upgrades); your rating moves with where you finish</label>`}
    <p class="error" role="alert" data-lobby-error></p>
    ${isHost ? `<button type="submit">Start match</button>` : `<p class="muted">Waiting for the host to start…</p>`}
    <button type="button" class="secondary" data-leave>Leave</button>
  </form></div>`;
  const form = host.querySelector<HTMLFormElement>("[data-form]")!;
  form.addEventListener("change", (e) => {
    const name = (e.target as HTMLElement).getAttribute("name");
    if (name === "tank") return hooks.onTank((e.target as HTMLSelectElement).value as TankKind);
    const limit = form.querySelector<HTMLInputElement>("[name=scoreLimit]");
    if (name === "mode" && limit) limit.value = "0";
    const f = new FormData(form);
    hooks.onSettings({
      mode: f.get("mode") as LobbySettings["mode"], scoreLimit: Number(f.get("scoreLimit") ?? 0), bots: Number(f.get("bots") ?? s.bots),
      mission: String(f.get("mission") ?? reached.at(-1)!.id),
      difficulty: (f.get("difficulty") ?? s.difficulty) as LobbySettings["difficulty"], teams: (f.get("teams") ?? s.teams) as LobbySettings["teams"],
      perks: f.has("perks") ? f.get("perks") === "on" : s.perks, map: String(f.get("map") ?? s.map), ranked: f.has("ranked"), public: f.has("public"),
      ...(customMap(String(f.get("map"))) ? { customMap: customMap(String(f.get("map")))! } : {}),
    });
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    hooks.onStart();
  });
  host.querySelector("[data-leave]")!.addEventListener("click", hooks.onLeave);
  const starts = host.querySelector<HTMLElement>("[data-starts]");
  if (starts) {
    // count down locally between lobby updates; stops once this screen is replaced
    const at = Date.now() + Number(starts.dataset.starts) * 1000;
    const t = setInterval(() => (starts.isConnected ? (starts.querySelector("b")!.textContent = String(Math.max(0, Math.ceil((at - Date.now()) / 1000)))) : clearInterval(t)), 250);
  }
  host.querySelector("[data-copy]")!.addEventListener("click", (e) => {
    e.preventDefault();
    void navigator.clipboard?.writeText(link);
    (e.target as HTMLElement).textContent = "link copied";
  });
}
