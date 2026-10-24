import { challengeDef, dailyChallenges, displayRating, gangDefs, gangIds, isUnlocked, levelFor, names, progressionDefs, specialDefs, specialKinds, tankDefs, tankKinds, tankName, tierFor, weaponPower, today, unlocksUpTo, type LevelInfo } from "@re-tanx/sim";
import { loadProfile, saveProfile } from "./localProfile.ts";
import { unlockLabel } from "./unlockLabel.ts";
import { esc } from "../esc.ts";
import { bindLoadout, loadoutHtml } from "./loadoutPicker.ts";
import { SPECIAL_LABEL } from "../../hud/specials.ts";
import { drawPickupFace } from "../../render/views/pickupIcons.ts";
import { PICKUP_STYLE } from "../../render/views/pickupView.ts";

const TABS = ["Overview", "Tanks", "Weapons", "Loadout"] as const;
const pct = (t: LevelInfo) => (t.next ? Math.round((t.into / t.next) * 100) : 100);
const bar = (t: LevelInfo) => `<div class="bar"><i style="width:${pct(t)}%"></i></div>`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const unlockAt = (key: string) => Object.entries(progressionDefs.unlocks).find(([, ks]) => (ks as string[]).includes(key))?.[0];

/** Level ring, then tabs: career + daily challenges, tank ranks + upgrades, weapon levels, loadout (perks, Oracle). */
export function showProfile(host: HTMLElement, onBack: () => void): void {
  const p = loadProfile();
  const lv = levelFor(p.xp);
  const titles = unlocksUpTo(lv.level).filter((k) => k.startsWith("title:")).map((k) => k.slice(6));
  const next = Object.entries(progressionDefs.unlocks).find(([l]) => Number(l) > lv.level);
  const ch = p.challenges?.day === today() ? p.challenges : { ids: dailyChallenges(today()), progress: {} as Record<string, number>, claimed: [] as string[] };
  const t = p.totals;
  const stats: [string, string | number][] = [
    ["Matches", t.matches], ["Wins", t.wins], ["Win rate", t.matches ? `${Math.round((t.wins / t.matches) * 100)}%` : "—"],
    ["Kills", t.kills], ["Deaths", t.deaths], ["K/D", t.deaths ? (t.kills / t.deaths).toFixed(2) : t.kills],
    ["Structures", t.structures], [names.queen.many, t.queens], ["Missions", t.missions],
    ...(p.rating ? [["Rating", displayRating(p.rating)] as [string, number]] : []),
  ];

  const overview = `
    <div class="pf-stats">${stats.map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join("")}</div>
    <h3>Today's challenges</h3><ul class="pf-list">${ch.ids.map((id) => {
      const d = challengeDef(id)!;
      const n = Math.min(d.target, ch.progress[id] ?? 0), done = ch.claimed.includes(id);
      return `<li class="${done ? "done" : ""}"><div class="pf-row"><span>${done ? "✓ " : ""}${d.label}</span><span class="muted">${n}/${d.target} · +${d.xp} XP</span></div>${bar({ level: 0, into: n, next: d.target })}</li>`;
    }).join("")}</ul>
    <h3>Gangs</h3><div class="chips">${gangIds.map((g) => {
      const at = unlockAt(`gang:${g}`);
      return isUnlocked(lv.level, `gang:${g}`) ? `<span class="chip">${gangDefs[g].name}</span>` : `<span class="chip locked">${gangDefs[g].name} · Lv ${at}</span>`;
    }).join("")}</div>`;

  const ups = progressionDefs.tankUpgrades;
  const tanks = `<small class="muted">Tank rank rises with kills made in that tank. Ranks ${ups.map((u) => u.rank).join(", ")} upgrade it (except in Arcade): ${ups.map((u) => `${u.name} ${u.up}`).join(" · ")}.</small><div class="pf-grid">${tankKinds.map((k) => {
    const r = tierFor(progressionDefs.mastery, p.masteryKills[k] ?? 0);
    const open = isUnlocked(lv.level, `tank:${k}`);
    const need = r.next ? `${plural(r.next - r.into, "kill")} to rank ${r.level + 1}` : "Max rank";
    const nextUp = ups.find((u) => u.rank > r.level);
    return `<div class="pf-item${open ? "" : " locked"}"><div class="pf-row"><small class="muted">${tankDefs[k].class.toUpperCase()}</small><i class="rank">${r.level}</i></div>
      <b>${tankName(k)}</b>${bar(r)}<small class="muted">${open ? need : `Unlocks at level ${unlockAt(`tank:${k}`)}`}</small>
      <div class="pips">${ups.map((u) => `<i class="${r.level >= u.rank ? "on" : ""}" title="${u.name}: ${u.up}"></i>`).join("")}</div>
      <small class="muted">${nextUp ? `Rank ${nextUp.rank}: ${nextUp.name} (${nextUp.up})` : "All upgrades"}</small></div>`;
  }).join("")}</div>`;

  const WX = progressionDefs.weaponXp, bonus = (l: number) => Math.round((weaponPower(l) - 1) * 100);
  const weapons = `<small class="muted">Specials earn XP: +${WX.use} per use, +${WX.kill} per kill. Each level adds +${bonus(2)}%: damage for attack specials, heal, duration or reach for the rest (not in Arcade).</small><div class="pf-grid">${specialKinds.map((k) => {
    const w = tierFor(progressionDefs.weaponLevels, p.weaponXp[k] ?? 0);
    const dmg = w.level > 1 ? ` · +${bonus(w.level)}% ${"damage" in specialDefs[k] ? "damage" : "effect"}` : "";
    const max = progressionDefs.weaponLevels.length;
    return `<div class="pf-item weapon"><img data-icon="${k}" alt="" width="44" height="44"><div><div class="pf-row"><b>${SPECIAL_LABEL[k]}</b><i class="rank">V${w.level}</i></div>
      <div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < w.level ? "on" : ""}"></i>`).join("")}</div>
      <small class="muted">${w.next ? `${w.next - w.into} XP to V${w.level + 1}` : "Fully upgraded"}${dmg}</small></div></div>`;
  }).join("")}</div>`;


  host.innerHTML = `<div class="overlay menu"><form class="card profile" data-form>
    <header class="pf-hero"><button type="button" class="secondary small pf-back" data-back>← Back</button>
      <div class="pf-ring" style="--p:${pct(lv)}"><b>${lv.level}</b><span>LEVEL</span></div>
      <div class="pf-id">
        <small class="muted">PROFILE</small>
        <h1>${esc(p.name ?? "Guest tanker")}</h1>
        <p><b>${lv.into.toLocaleString()}</b> / ${lv.next ? `${lv.next.toLocaleString()} XP · ${(lv.next - lv.into).toLocaleString()} to level ${lv.level + 1}` : "max level"}</p>
        <label class="pf-title">Title <select name="title"><option value="">—</option>${titles.map((x) => `<option${x === p.title ? " selected" : ""}>${x}</option>`).join("")}</select></label>
      </div>
    </header>
    ${next ? `<div class="pf-next"><small class="muted">LEVEL ${next[0]} UNLOCKS</small><div class="chips">${next[1].map((k) => `<span class="chip">${unlockLabel(k)}</span>`).join("")}</div></div>` : ""}
    <div class="pf-tabs" role="tablist">${TABS.map((x, i) => `<button type="button" role="tab" class="secondary" data-tab="${i}" aria-selected="${i === 0}">${x}</button>`).join("")}</div>
    ${[overview, tanks, weapons, `<div data-loadout>${loadoutHtml(p)}</div>`].map((body, i) => `<section class="pf-panel" role="tabpanel" data-panel="${i}"${i ? " hidden" : ""}>${body}</section>`).join("")}
  </form></div>`;

  host.querySelectorAll<HTMLImageElement>("[data-icon]").forEach((img) => {
    const k = img.dataset.icon as (typeof specialKinds)[number];
    const c = document.createElement("canvas");
    drawPickupFace(c, k, PICKUP_STYLE[k].color);
    img.src = c.toDataURL();
  });
  host.querySelector(".pf-tabs")!.addEventListener("click", (e) => {
    const i = (e.target as HTMLElement).closest<HTMLElement>("[data-tab]")?.dataset.tab;
    if (i === undefined) return;
    host.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String((b as HTMLElement).dataset.tab === i)));
    host.querySelectorAll<HTMLElement>("[data-panel]").forEach((s) => (s.hidden = s.dataset.panel !== i));
  });
  bindLoadout(host);
  const title = host.querySelector<HTMLSelectElement>("[name=title]")!;
  title.addEventListener("change", () => saveProfile({ ...loadProfile(), title: title.value || undefined }));
  host.querySelector("[data-back]")!.addEventListener("click", onBack);
}
