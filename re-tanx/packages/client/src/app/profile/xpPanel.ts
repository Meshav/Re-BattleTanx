import { levelFor, type MatchResult } from "@re-tanx/sim";
import { unlockLabel } from "./unlockLabel.ts";

/** XP breakdown + level bar (filling from where you started) + anything newly unlocked, for the results / debrief screens. */
export function xpPanel(r: MatchResult): string {
  const lv = levelFor(r.profile.xp), was = levelFor(r.profile.xp - r.award.total);
  const pct = (l: typeof lv) => (l.next ? Math.round((l.into / l.next) * 100) : 100);
  const from = r.levelAfter > r.levelBefore ? 0 : pct(was);
  const lines = r.award.lines.map((l) => `<tr><td>${l.label}</td><td>${l.xp > 0 ? "+" : ""}${l.xp}</td></tr>`).join("");
  const up = r.levelAfter > r.levelBefore ? `<p class="levelup">LEVEL UP — ${r.levelAfter}</p>` : "";
  const unlocks = r.unlocked.length ? `<div class="chips unlocks">${r.unlocked.map((k) => `<span class="chip">${unlockLabel(k)}</span>`).join("")}</div>` : "";
  return `<div class="xp"><table class="score"><tbody>${lines}<tr><th>XP</th><th>+${r.award.total}</th></tr></tbody></table>
    ${r.rating ? `<p class="rating">Rating ${r.rating.after} <span class="${r.rating.after >= r.rating.before ? "up" : "down"}">(${r.rating.after >= r.rating.before ? "+" : ""}${r.rating.after - r.rating.before})</span></p>` : ""}
    ${up}<div class="lvl"><i class="lvl-badge">${lv.level}</i><div class="bar"><i style="width:${pct(lv)}%;--from:${from}%"></i></div><span class="muted small">${lv.into} / ${lv.next || "max"}</span></div>${unlocks}</div>`;
}
