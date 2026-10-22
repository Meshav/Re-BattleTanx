import { gangDefs, gangIds, type GangId } from "@re-tanx/sim";
import { fetchHistory, fetchLeaderboard, fetchProviders, signedInWith, startSignIn } from "../net/identity.ts";
import { MODE_SHORT } from "./modeLabels.ts";
import { allArenas } from "./editor/customMaps.ts";
import type { ModeKind } from "@re-tanx/sim";
import { pendingRejoin } from "./rejoin.ts";
import { esc } from "./esc.ts";

export interface OnlineChoice {
  name: string; gang: GangId; join: string | undefined;
  /** reconnecting to a running match (lobby code), retrying until `until` */
  rejoin?: string; until?: number;
  /** quick match: any open public lobby */
  quick?: boolean;
}

const KEY = "re-tanx:online";
function load(): { name: string; gang: GangId } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}") as { name?: string; gang?: GangId };
    return { name: v.name ?? "", gang: gangIds.includes(v.gang as GangId) ? (v.gang as GangId) : "ironHounds" };
  } catch {
    return { name: "", gang: "ironHounds" };
  }
}

/** Name + gang, then host a new lobby or join one by code. */
export function showOnlineMenu(host: HTMLElement, error: string | undefined, hooks: { onGo(c: OnlineChoice): void; onBack(): void }): void {
  const saved = load();
  const rejoin = pendingRejoin();
  const code = new URLSearchParams(location.search).get("join") ?? "";
  host.innerHTML = `<div class="overlay menu"><form class="card wide" data-form>
    <h1>ONLINE</h1>
    ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ""}
    <div class="row">
      <label>Name <input name="name" maxlength="16" required value="${esc(saved.name)}" autocomplete="nickname"></label>
      <label>Gang <select name="gang">${gangIds.map((g) => `<option value="${g}"${g === saved.gang ? " selected" : ""}>${gangDefs[g].name}</option>`).join("")}</select></label>
    </div>
    <div class="row"><button type="submit" name="action" value="quick" style="flex:2">Quick match</button><button type="submit" name="action" value="host" class="secondary" style="flex:1">Host a lobby</button></div>
    <div class="row"><label>Lobby code <input name="code" maxlength="5" value="${code}" placeholder="ABCDE" autocapitalize="characters" style="text-transform:uppercase"></label>
      <button type="submit" name="action" value="join" class="secondary">Join</button></div>
    <div class="row signin" data-signin>${signedInWith() ? `<span class="muted">Signed in with ${esc(signedInWith()!)} ✓</span>` : ""}</div>
    ${rejoin ? `<button type="button" data-rejoin>Rejoin your match (${esc(rejoin.rejoin!)})</button>` : ""}
    <div class="row"><button type="button" class="secondary" data-board>Ranked leaderboard</button><button type="button" class="secondary" data-history>Match history</button><button type="button" class="secondary" data-back>Back</button></div>
    <div data-board-view></div>
  </form></div>`;
  if (rejoin) host.querySelector("[data-rejoin]")!.addEventListener("click", () => hooks.onGo(rejoin));
  host.querySelector("[data-board]")!.addEventListener("click", () => void showBoard(host.querySelector<HTMLElement>("[data-board-view]")!));
  host.querySelector("[data-history]")!.addEventListener("click", () => void showHistory(host.querySelector<HTMLElement>("[data-board-view]")!));
  if (!signedInWith()) void fetchProviders().then((ps) => {
    const el = host.querySelector("[data-signin]");
    if (!el || !ps.length) return;
    el.innerHTML = `<span class="muted small">Keep your progress on every device:</span>${ps.map((p) => `<button type="button" class="secondary small" data-provider="${esc(p.id)}">Sign in with ${esc(p.label)}</button>`).join("")}`;
    el.querySelectorAll<HTMLButtonElement>("[data-provider]").forEach((b) => b.addEventListener("click", () => startSignIn(b.dataset.provider!)));
  });
  const form = host.querySelector<HTMLFormElement>("[data-form]")!;
  host.querySelector("[data-back]")!.addEventListener("click", hooks.onBack);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const action = (e.submitter as HTMLButtonElement | null)?.value;
    const choice = { name: String(f.get("name")).trim(), gang: f.get("gang") as GangId };
    try {
      localStorage.setItem(KEY, JSON.stringify(choice));
    } catch {
      // storage blocked: fine
    }
    const joinCode = String(f.get("code")).trim().toUpperCase();
    if (action === "join" && joinCode.length !== 5) return void form.querySelector<HTMLInputElement>("[name=code]")!.focus();
    hooks.onGo({ ...choice, join: action === "join" ? joinCode : undefined, quick: action === "quick" });
  });
  form.querySelector<HTMLInputElement>(saved.name ? "[type=submit]" : "[name=name]")!.focus();
}

async function showBoard(el: HTMLElement): Promise<void> {
  el.innerHTML = `<p class="muted">Loading…</p>`;
  const rows = await fetchLeaderboard();
  if (!rows) return void (el.innerHTML = `<p class="error">Can't reach the game server</p>`);
  el.innerHTML = rows.length
    ? `<table class="score"><thead><tr><th>#</th><th>Player</th><th>Rating</th><th>Games</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td>${r.rating}</td><td>${r.games}</td></tr>`).join("")}</tbody></table>`
    : `<p class="muted">No ranked matches yet. Tick "Ranked" in a lobby with a friend.</p>`;
}

async function showHistory(el: HTMLElement): Promise<void> {
  el.innerHTML = `<p class="muted">Loading…</p>`;
  const rows = await fetchHistory();
  if (!rows) return void (el.innerHTML = `<p class="error">Can't reach the game server</p>`);
  const arena = (id: string) => allArenas().find((m) => m.id === id)?.name ?? (id.startsWith("c-") ? "Custom arena" : id);
  const when = (t: number) => new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  el.innerHTML = rows.length
    ? `<table class="score"><thead><tr><th>When</th><th>Mode</th><th>Arena</th><th>Place</th><th>K/D</th><th>XP</th></tr></thead><tbody>${rows.map((r) => `<tr class="${r.won ? "win" : ""}">
        <td>${when(r.endedAt)}</td><td>${esc(MODE_SHORT[r.mode as ModeKind] ?? r.mode)}${r.ranked ? " ★" : ""}</td><td>${esc(arena(r.mapId))}</td>
        <td>${r.leftEarly ? "left" : `${r.place + 1} / ${r.players}`}</td><td>${r.kills} / ${r.deaths}</td>
        <td>+${r.xp}${r.ratingDelta !== undefined ? ` <span class="${r.ratingDelta >= 0 ? "up" : "down"}">${r.ratingDelta >= 0 ? "+" : ""}${r.ratingDelta}</span>` : ""}</td></tr>`).join("")}</tbody></table>`
    : `<p class="muted">No online matches yet.</p>`;
}
