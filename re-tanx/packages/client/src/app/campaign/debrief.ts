import { bindReplayButtons, replayButtons, type ReplayHooks } from "../results.ts";
import { finalScore, type MatchResult, type World } from "@re-tanx/sim";
import { xpPanel } from "../profile/xpPanel.ts";
import { names } from "@re-tanx/sim";

/** Mission result: outcome, objectives, score breakdown, grade, wallet. */
export function showDebrief(host: HTMLElement, world: World, hooks: { onNext?(): void; onRetry?(): void; onMenu(): void; menuLabel?: string; xp?: MatchResult; replay?: ReplayHooks }): void {
  const c = world.campaign!;
  const won = c.outcome === "won";
  const s = finalScore(world);
  const objectives = c.mission.objectives.map((o, i) => {
    const st = c.objectives[i]!;
    const mark = st.done ? "✓" : st.failed || won ? "✗" : "·";
    return `<li class="${st.done ? "ok" : "muted"}">${mark} ${o.optional ? "Bonus: " : ""}${o.label}</li>`;
  }).join("");
  host.innerHTML = `<div class="overlay"><div class="card wide story">
    <p class="muted small">${c.mission.location.toUpperCase()}</p>
    <h1>${won ? "Mission complete" : "Mission failed"}</h1>
    <p>${won ? c.mission.debrief : (c.failReason ?? "Your squad was wiped out.")}</p>
    <ul class="objectives">${objectives}</ul>
    ${won ? `<table class="score"><tbody>
      <tr><td>Combat score</td><td>${c.score}</td></tr><tr><td>Time bonus</td><td>${s.timeBonus}</td></tr>
      <tr><td>No-loss bonus</td><td>${s.noDeathBonus}</td></tr><tr><th>Total</th><th>${s.total}</th></tr></tbody></table>
      <p class="grade-big">Grade <b>${s.grade}</b> · ${names.currency} <b class="bucks">${c.bucks}</b></p>` : `<p class="muted">Retry starts with the ${c.bucksOnEntry} ${names.currency} you brought in.</p>`}
    ${hooks.xp ? xpPanel(hooks.xp) : ""}
    <div class="row">${won && hooks.onNext ? `<button data-next>Next mission</button>` : ""}
      ${hooks.onRetry ? `<button data-retry class="${won ? "secondary" : ""}">${won ? "Replay" : "Retry"}</button>` : ""}
      <button data-menu class="secondary">${hooks.menuLabel ?? "Campaign"}</button>${replayButtons(hooks.replay)}</div>
  </div></div>`;
  if (hooks.onNext) host.querySelector("[data-next]")?.addEventListener("click", hooks.onNext);
  if (hooks.onRetry) host.querySelector("[data-retry]")!.addEventListener("click", hooks.onRetry);
  host.querySelector("[data-menu]")!.addEventListener("click", hooks.onMenu);
  bindReplayButtons(host, hooks.replay);
  host.querySelector<HTMLButtonElement>("[data-next], [data-retry], [data-menu]")!.focus();
}
