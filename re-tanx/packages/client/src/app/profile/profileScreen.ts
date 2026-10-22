import { challengeDef, gangDefs, levelFor, masteryLevel, perkDefs, perkIds, perkSlots, progressionDefs, tankKinds, today, unlocksUpTo, legalPerks, dailyChallenges, type PerkId } from "@re-tanx/sim";
import { loadProfile, saveProfile } from "./localProfile.ts";
import { unlockLabel } from "./unlockLabel.ts";
import { tankName } from "@re-tanx/sim";

/** Level, unlock track, perk loadout, title, daily challenges, tank mastery and lifetime totals. */
export function showProfile(host: HTMLElement, onBack: () => void): void {
  const p = loadProfile();
  const lv = levelFor(p.xp);
  const slots = perkSlots(lv.level);
  const titles = unlocksUpTo(lv.level).filter((k) => k.startsWith("title:")).map((k) => k.slice(6));
  const next = Object.entries(progressionDefs.unlocks).find(([l]) => Number(l) > lv.level);
  const ch = p.challenges?.day === today() ? p.challenges : { ids: dailyChallenges(today()), progress: {} as Record<string, number>, claimed: [] as string[] };
  host.innerHTML = `<div class="overlay menu"><form class="card wide" data-form>
    <h1>PROFILE</h1>
    <div class="lvl"><b>Level ${lv.level}</b><div class="bar"><i style="width:${lv.next ? (lv.into / lv.next) * 100 : 100}%"></i></div><span class="muted small">${lv.into} / ${lv.next || "max"} XP</span></div>
    ${next ? `<p class="muted small">Level ${next[0]}: ${next[1].map(unlockLabel).join(" · ")}</p>` : ""}
    <label>Title <select name="title"><option value="">—</option>${titles.map((t) => `<option${t === p.title ? " selected" : ""}>${t}</option>`).join("")}</select></label>
    <fieldset><legend>Perks — ${slots} slot${slots === 1 ? "" : "s"} (sidegrades; off in Classic lobbies)</legend>
      ${perkIds.map((id) => `<label class="perk"><input type="checkbox" name="perk" value="${id}"${p.perks.includes(id) ? " checked" : ""}${slots ? "" : " disabled"}>
        <b>${perkDefs[id].name}</b> <span class="ok">${perkDefs[id].up}</span> / <span class="bad">${perkDefs[id].down}</span></label>`).join("")}
    </fieldset>
    <h3>Today's challenges</h3><ul class="objectives">${ch.ids.map((id) => {
      const d = challengeDef(id)!;
      const done = ch.claimed.includes(id);
      return `<li class="${done ? "ok" : ""}">${done ? "✓" : "○"} ${d.label} — ${Math.min(d.target, ch.progress[id] ?? 0)}/${d.target} · ${d.xp} XP</li>`;
    }).join("")}</ul>
    <h3>Tank mastery</h3><div class="mastery">${tankKinds.map((k) => `<span><b>${tankName(k).toUpperCase()}</b> ${masteryLevel(p.masteryKills[k] ?? 0)}</span>`).join("")}</div>
    <h3>Career</h3><p class="small">${Object.entries(p.totals).map(([k, v]) => `${k} <b>${v}</b>`).join(" · ")}</p>
    <p class="muted small">Gangs unlocked: ${unlocksUpTo(lv.level).filter((k) => k.startsWith("gang:")).map((k) => gangDefs[k.slice(5) as keyof typeof gangDefs]?.name).join(", ")}</p>
    <button type="button" class="secondary" data-back>Back</button>
  </form></div>`;
  const form = host.querySelector<HTMLFormElement>("[data-form]")!;
  form.addEventListener("change", () => {
    const f = new FormData(form);
    const chosen = legalPerks(p, f.getAll("perk") as PerkId[]);
    saveProfile({ ...loadProfile(), perks: chosen, title: String(f.get("title")) || undefined });
    form.querySelectorAll<HTMLInputElement>("[name=perk]").forEach((b) => {
      b.checked = chosen.includes(b.value as PerkId);
      b.disabled = !b.checked && chosen.length >= slots;
    });
  });
  form.dispatchEvent(new Event("change"));
  host.querySelector("[data-back]")!.addEventListener("click", onBack);
}
