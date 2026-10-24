import {
  bondFor, isPro, isUnlocked, legalOracle, legalPerks, levelFor, maxBond, MAX_WINGMEN, names, oracleDefs, oracleIds, oracleProgress, perkDefs, perkIds,
  perkLevel, perkSlots, progressionDefs, wingmenOracles, type Profile, type SpecialKind,
} from "@re-tanx/sim";
import { loadProfile, saveProfile } from "./localProfile.ts";
import { SPECIAL_LABEL } from "../../hud/specials.ts";

const ORACLE = names.queen.one;
const ROMAN = ["I", "II", "III", "PRO"];
const pct = (have: number, need: number) => Math.min(100, Math.round((have / Math.max(1, need)) * 100));
const bar = (have: number, need: number) => `<div class="bar"><i style="width:${pct(have, need)}%"></i></div>`;
const unlockAt = (key: string) => Object.entries(progressionDefs.unlocks).find(([, ks]) => (ks as string[]).includes(key))?.[0];

/** "Scavenger, Treads · Oracle Vesper · wingmen: Ione" */
export const loadoutSummary = (p: Profile): string =>
  `${p.perks.map((id) => perkDefs[id].name).join(", ") || "No perks"} · ${p.oracle ? `${ORACLE} ${oracleDefs[p.oracle].name}` : `No ${ORACLE}`}`
  + (p.wingmen.length ? ` · wingmen: ${p.wingmen.map((id) => oracleDefs[id].name).join(", ")}` : "");

/** Selects for the Oracles your AI wingmen carry (missions with allies), first wingman first. */
function wingmenHtml(p: Profile): string {
  const open = oracleIds.filter((id) => legalOracle(p, id) && id !== p.oracle);
  if (!open.length) return `<small class="muted">Unlock another ${ORACLE} to send one with your AI wingmen.</small>`;
  return `<div class="row">${Array.from({ length: MAX_WINGMEN }, (_, i) => `<label>Wingman ${i + 1} <select name="wingman"><option value="">—</option>${open.map((id) =>
    `<option value="${id}"${p.wingmen[i] === id ? " selected" : ""}>${oracleDefs[id].name} · bond ${bondFor(p.bonds[id] ?? 0).level}</option>`).join("")}</select></label>`).join("")}</div>
    <small class="muted">Wingmen fight with their ${ORACLE}'s passive and gift, and earn bond with her on their own kills. Not the one riding with you; each goes once.</small>`;
}

/** Perk cards (level I–III → PRO) and Oracle cards (bond 1–5), as checkboxes / radios. Bind with bindLoadout. */
export function loadoutHtml(p: Profile = loadProfile()): string {
  const level = levelFor(p.xp).level, slots = perkSlots(level);
  const perks = perkIds.map((id) => {
    const d = perkDefs[id], n = p.perkProgress[id] ?? 0, lv = perkLevel(id, n).level;
    if (!isUnlocked(level, `perk:${id}`)) return `<div class="pf-item perk locked"><b>${d.name}</b><small class="muted">Unlocks at level ${unlockAt(`perk:${id}`)}</small></div>`;
    const pro = isPro(p, id)
      ? `<small class="pro">PRO: ${d.pro.up}</small>`
      : `<small class="muted">PRO: ${d.pro.up} · ${d.pro.label} ${Math.min(n, d.pro.target)}/${d.pro.target}</small>${bar(n, d.pro.target)}`;
    return `<label class="pf-item perk"><input type="checkbox" name="perk" value="${id}"${p.perks.includes(id) ? " checked" : ""}>
      <div class="pf-row"><b>${d.name}</b><i class="rank${lv === 4 ? " pro" : ""}">${ROMAN[lv - 1]}</i></div>
      <small class="ok">${d.up}</small><small class="bad">${d.down}</small>${pro}</label>`;
  }).join("");
  const oracles = oracleIds.map((id) => {
    const d = oracleDefs[id];
    if (!legalOracle(p, id)) {
      const u = oracleProgress(p, id);
      return `<div class="pf-item oracle locked"><b>${d.name} <span class="muted">${d.title}</span></b><small class="muted">${d.unlock.label} · ${Math.min(u.have, u.need)}/${u.need}</small>${bar(u.have, u.need)}</div>`;
    }
    const b = bondFor(p.bonds[id] ?? 0);
    return `<label class="pf-item oracle"><input type="radio" name="oracle" value="${id}"${p.oracle === id ? " checked" : ""}>
      <div class="pf-row"><b>${d.name} <span class="muted">${d.title}</span></b><i class="rank">Bond ${b.level}</i></div>
      <small class="ok">${d.up} <span class="muted">(${Math.round((b.level / maxBond) * 100)}% now)</span></small>
      <small class="${b.level >= d.gift.bond ? "pro" : "muted"}">Bond ${d.gift.bond}: start each life with ${d.gift.amount} ${SPECIAL_LABEL[d.gift.special as SpecialKind]}</small>
      ${bar(b.into, b.next || 1)}<small class="muted">${b.next ? `${b.next - b.into} bond XP to bond ${b.level + 1}` : "Max bond"}</small></label>`;
  }).join("");
  return `<small class="muted">${slots} perk slot${slots === 1 ? "" : "s"} and one ${ORACLE}. Loadouts are off in Arcade.</small>
    <h3>Perks</h3><div class="pf-grid">${perks}</div>
    <h3>${names.queen.many}</h3><div class="pf-grid">
      <label class="pf-item oracle"><input type="radio" name="oracle" value=""${p.oracle ? "" : " checked"}><b>None</b><small class="muted">Go in alone.</small></label>${oracles}</div>
    <h3>Wingmen</h3><div data-wingmen>${wingmenHtml(p)}</div>`;
}

/** Collapsible loadout for pre-match screens (menu, campaign briefing). */
export const loadoutDetails = (p: Profile = loadProfile()): string =>
  `<details class="menu-section"><summary>Loadout <span data-loadout-summary>${loadoutSummary(p)}</span></summary><div class="menu-options" data-loadout>${loadoutHtml(p)}</div></details>`;

/** Save picks to the profile as they change; enforce slots and unlocks. */
export function bindLoadout(host: HTMLElement): void {
  const root = host.querySelector<HTMLElement>("[data-loadout]") ?? host;
  const sync = () => {
    const p = loadProfile();
    const perks = legalPerks(p, [...root.querySelectorAll<HTMLInputElement>("[name=perk]:checked")].map((b) => b.value));
    const oracle = legalOracle(p, root.querySelector<HTMLInputElement>("[name=oracle]:checked")?.value);
    const wish = [...root.querySelectorAll<HTMLSelectElement>("[name=wingman]")].map((s) => s.value);
    const next = { ...p, perks, oracle, wingmen: wingmenOracles(p, wish, oracle).map((w) => w.id) };
    saveProfile(next);
    const wingmen = root.querySelector<HTMLElement>("[data-wingmen]");
    if (wingmen) wingmen.innerHTML = wingmenHtml(next); // drops a pick that's now riding with you, or a repeat
    const full = perks.length >= perkSlots(levelFor(p.xp).level);
    root.querySelectorAll<HTMLInputElement>("[name=perk]").forEach((b) => {
      b.checked = perks.includes(b.value as (typeof perks)[number]);
      b.disabled = !b.checked && full;
    });
    const summary = host.querySelector("[data-loadout-summary]");
    if (summary) summary.textContent = loadoutSummary(next);
  };
  root.addEventListener("change", sync);
  sync();
}
