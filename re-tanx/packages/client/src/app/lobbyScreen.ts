import { difficulties, gangDefs, modeKinds, versusMaps, type LobbySettings, type ServerMsg } from "@re-tanx/sim";
import { MODE_SHORT } from "./modeLabels.ts";
import { allArenas, customMap } from "./editor/customMaps.ts";
import { esc } from "./esc.ts";

type LobbyMsg = Extract<ServerMsg, { t: "lobby" }>;
const opt = (vals: readonly string[], sel: string, label = (v: string) => v) => vals.map((v) => `<option value="${v}"${v === sel ? " selected" : ""}>${label(v)}</option>`).join("");

/** Waiting room: share the code, host tweaks settings and starts. */
export function showLobby(host: HTMLElement, lobby: LobbyMsg, myId: number, hooks: { onSettings(s: LobbySettings): void; onStart(): void; onLeave(): void }): void {
  const isHost = lobby.members.find((m) => m.id === myId)?.host ?? false;
  // the host offers their own arenas; guests see whatever custom arena the host picked
  const arenas = isHost ? allArenas() : [...versusMaps, ...(lobby.settings.customMap ? [lobby.settings.customMap] : [])];
  const s = lobby.settings;
  const link = `${location.origin}${location.pathname}?join=${lobby.code}`;
  const dis = isHost ? "" : " disabled";
  const fixed = s.ranked ? " disabled" : dis; // ranked pins these
  host.innerHTML = `<div class="overlay menu"><form class="card wide" data-form>
    <h1>LOBBY <span class="code">${lobby.code}</span></h1>
    <p class="muted small">Share the code or <a href="${link}" data-copy>copy invite link</a>.</p>
    <ul class="members">${lobby.members.map((m) => `<li>${m.host ? "★ " : ""}${m.name} <span class="muted">${gangDefs[m.gang].name}</span>${m.id === myId ? " (you)" : ""}</li>`).join("")}</ul>
    <label>Arena <select name="map"${dis}>${arenas.map((m) => `<option value="${m.id}"${m.id === s.map ? " selected" : ""}>${esc(m.name)}${m.id.startsWith("c-") ? " ✎" : ""}</option>`).join("")}</select></label>
    <div class="row">
      <label>Mode <select name="mode"${dis}>${opt(modeKinds, s.mode, (v) => MODE_SHORT[v as keyof typeof MODE_SHORT])}</select></label>
      <label>Score limit <input name="scoreLimit" type="number" min="0" max="300" value="${s.scoreLimit}"${dis} title="0 = mode default"></label>
    </div>
    <div class="row">
      <label>Bots <input name="bots" type="number" min="0" max="7" value="${s.bots}"${fixed}></label>
      <label>Bot skill <select name="difficulty"${fixed}>${opt(difficulties, s.difficulty)}</select></label>
      <label>Teams <select name="teams"${fixed}>${opt(["ffa", "coop"], s.teams, (v) => (v === "ffa" ? "Free-for-all" : "Humans vs bots"))}</select></label>
      <label>Perks <select name="perks"${fixed}>${opt(["on", "off"], s.perks ? "on" : "off", (v) => (v === "on" ? "On" : "Off (Classic)"))}</select></label>
    </div>
    <label class="check"><input type="checkbox" name="public"${s.public ? " checked" : ""}${dis}> Public — quick match can drop players in; starts by itself</label>
    ${lobby.startsIn !== undefined ? `<p class="starts" data-starts="${lobby.startsIn}">Starting in <b>${lobby.startsIn}</b>s</p>` : ""}
    <label class="check"><input type="checkbox" name="ranked"${s.ranked ? " checked" : ""}${dis}> Ranked — humans only, free-for-all, no perks; your rating moves with where you finish</label>
    <p class="error" role="alert" data-lobby-error></p>
    ${isHost ? `<button type="submit">Start match</button>` : `<p class="muted">Waiting for the host to start…</p>`}
    <button type="button" class="secondary" data-leave>Leave</button>
  </form></div>`;
  const form = host.querySelector<HTMLFormElement>("[data-form]")!;
  form.addEventListener("change", (e) => {
    if ((e.target as HTMLElement).getAttribute("name") === "mode") form.querySelector<HTMLInputElement>("[name=scoreLimit]")!.value = "0";
    const f = new FormData(form);
    hooks.onSettings({
      mode: f.get("mode") as LobbySettings["mode"], scoreLimit: Number(f.get("scoreLimit")), bots: Number(f.get("bots")),
      difficulty: (f.get("difficulty") ?? s.difficulty) as LobbySettings["difficulty"], teams: f.get("teams") as LobbySettings["teams"],
      perks: f.get("perks") === "on", map: String(f.get("map")), ranked: f.has("ranked"), public: f.has("public"),
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
