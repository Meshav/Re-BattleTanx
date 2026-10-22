import type { MissionDef } from "@re-tanx/sim";
import type { Progress } from "./progress.ts";
import { names } from "@re-tanx/sim";

/** Mission select: locked/unlocked, best grade, wallet, difficulty, 1–2 players. */
export function showCampaignMenu(host: HTMLElement, missions: MissionDef[], p: Progress, hooks: { onPlay(i: number, p: Progress): void; onReset(): void; onBack(): void }): void {
  const ACT = ["", "Act I — The Long Road West", "Act II — The Long Road East"];
  const rows = missions.map((m, i) => {
    const locked = i > p.unlocked;
    const grade = p.grades[m.id];
    const header = i === 0 || missions[i - 1]!.act !== m.act ? `<li class="act">${ACT[m.act] ?? `Act ${m.act}`}</li>` : "";
    return `${header}<li><button type="button" class="mission${locked ? " locked" : ""}" data-i="${i}"${locked ? " disabled" : ""}>
      <span class="num">${i + 1}</span><span class="t"><b>${m.title}</b><span class="muted small">${m.location}</span></span>
      <span class="grade">${grade ?? (locked ? "🔒" : "")}</span></button></li>`;
  }).join("");
  host.innerHTML = `<div class="overlay menu"><form class="card wide" data-form>
    <h1>CAMPAIGN</h1>
    <p class="muted">${names.currency}: <b class="bucks">${p.bucks}</b></p>
    <ol class="missions">${rows}</ol>
    <div class="row">
      <label>Difficulty <select name="difficulty">${["easy", "normal", "hard"].map((d) => `<option${d === p.difficulty ? " selected" : ""}>${d}</option>`).join("")}</select></label>
      <label>Players <select name="players"><option value="1"${p.players === 1 ? " selected" : ""}>1</option><option value="2"${p.players === 2 ? " selected" : ""}>2 — co-op split-screen</option></select></label>
    </div>
    <div class="row"><button type="button" class="secondary" data-back>Back</button><button type="button" class="secondary small" data-reset>Reset campaign</button></div>
  </form></div>`;
  const read = (): Progress => {
    const f = new FormData(host.querySelector<HTMLFormElement>("[data-form]")!);
    return { ...p, difficulty: f.get("difficulty") as Progress["difficulty"], players: f.get("players") === "2" ? 2 : 1 };
  };
  host.querySelectorAll<HTMLButtonElement>(".mission:not([disabled])").forEach((b) => b.addEventListener("click", () => hooks.onPlay(Number(b.dataset.i), read())));
  host.querySelector("[data-back]")!.addEventListener("click", hooks.onBack);
  host.querySelector("[data-reset]")!.addEventListener("click", () => confirm(`Reset campaign progress and ${names.currency}?`) && hooks.onReset());
  host.querySelector<HTMLButtonElement>(`.mission[data-i="${Math.min(p.unlocked, missions.length - 1)}"]`)?.focus();
}
