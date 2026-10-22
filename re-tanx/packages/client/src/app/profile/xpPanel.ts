import { levelFor, type MatchResult } from "@re-tanx/sim";
import { unlockLabel } from "./unlockLabel.ts";

/** XP breakdown + level bar + anything newly unlocked, for the results / debrief screens. */
export function xpPanel(r: MatchResult): string {
  const lv = levelFor(r.profile.xp);
  const pct = lv.next ? Math.round((lv.into / lv.next) * 100) : 100;
  const lines = r.award.lines.map((l) => `<tr><td>${l.label}</td><td>${l.xp > 0 ? "+" : ""}${l.xp}</td></tr>`).join("");
  const up = r.levelAfter > r.levelBefore ? `<p class="levelup">LEVEL UP — ${r.levelAfter}</p>` : "";
  const unlocks = r.unlocked.length ? `<p class="unlocks">Unlocked: ${r.unlocked.map(unlockLabel).join(" · ")}</p>` : "";
  return `<div class="xp"><table class="score"><tbody>${lines}<tr><th>XP</th><th>+${r.award.total}</th></tr></tbody></table>
    ${r.rating ? `<p class="rating">Rating ${r.rating.after} <span class="${r.rating.after >= r.rating.before ? "up" : "down"}">(${r.rating.after >= r.rating.before ? "+" : ""}${r.rating.after - r.rating.before})</span></p>` : ""}
    ${up}<div class="lvl"><b>Lv ${lv.level}</b><div class="bar"><i style="width:${pct}%"></i></div><span class="muted small">${lv.into} / ${lv.next || "max"}</span></div>${unlocks}</div>`;
}
