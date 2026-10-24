import { levelFor, masteryLevel, progressionDefs, tankName, weaponLevel, type Profile, type SimEvent, type SpecialKind, type World } from "@re-tanx/sim";
import { SPECIAL_LABEL } from "./specials.ts";
import { settings } from "../settings/settings.ts";

/**
 * In-match progression for the profile's owner: an XP strip that fills per kill, "+XP" pops, and a banner when the
 * account level, tank rank or a weapon level goes up. Counts the same way as stepStats / matchXp, so it agrees with the
 * end-of-match award (which adds the completion and victory XP on top).
 */
const W = progressionDefs.weaponXp;

export interface Tally { tankId: number; perKill: number; xp: number; kills: Profile["masteryKills"]; weaponXp: Profile["weaponXp"] }
export interface RankUp { kind: "acct" | "tank" | "weapon"; badge: string; title: string; sub: string }
export interface LiveProgress { el: HTMLElement; strip: HTMLElement; tally: Tally }

export function newTally(p: Profile, tankId: number, world: World): Tally {
  const X = progressionDefs.xp;
  const botsOnly = world.tanks.filter((t) => !world.bots[t.id]).length <= 1 && !world.campaign;
  return { tankId, perKill: Math.round(X.kill * (botsOnly ? X.botOnlyFactor : 1)), xp: p.xp, kills: { ...p.masteryKills }, weaponXp: { ...p.weaponXp } };
}

/** Fold one batch of events into the tally: XP gained and anything that ranked up. */
export function tallyEvents(t: Tally, events: SimEvent[], world: World): { xp: number; ups: RankUp[] } {
  let xp = 0;
  const ups: RankUp[] = [];
  const weaponUp = (k: SpecialKind, n: number) => {
    const v = bump(t.weaponXp, k, weaponLevel, n);
    if (v) ups.push({ kind: "weapon", badge: `V${v}`, title: `${SPECIAL_LABEL[k]} upgraded`, sub: `Weapon level V${v}` });
  };
  for (const e of events) {
    if (e.type === "kill" && e.killerId === t.tankId) {
      const me = world.tanks.find((k) => k.id === t.tankId), victim = world.tanks.find((k) => k.id === e.victimId);
      if (!me || !victim || me.team === victim.team) continue;
      const before = levelFor(t.xp).level;
      t.xp += t.perKill;
      xp += t.perKill;
      const lv = levelFor(t.xp).level;
      if (lv > before) ups.push({ kind: "acct", badge: String(lv), title: "Level up", sub: `Level ${lv} reached` });
      const rank = bump(t.kills, me.kind, masteryLevel);
      const upgrade = progressionDefs.tankUpgrades.find((u) => u.rank === rank);
      if (rank) ups.push({ kind: "tank", badge: String(rank), title: `${tankName(me.kind)} rank up`, sub: upgrade ? `Rank ${rank} · ${upgrade.name}: ${upgrade.up}` : `Tank rank ${rank}` });
      if (e.weapon) weaponUp(e.weapon, W.kill);
    }
    if (e.type === "special" && e.tankId === t.tankId) weaponUp(e.kind, W.use);
  }
  return { xp, ups };
}

export function createLiveProgress(root: HTMLElement, p: Profile, tankId: number, world: World): LiveProgress {
  const el = document.createElement("div");
  el.className = `hud-progress${settings().reducedMotion ? " calm" : ""}`;
  el.innerHTML = `<div class="xp-strip"><b></b><div class="bar"><i></i></div></div><div class="rank-stack"></div>`;
  root.append(el);
  const lp = { el, strip: el.querySelector<HTMLElement>(".xp-strip")!, tally: newTally(p, tankId, world) };
  drawStrip(lp);
  return lp;
}

/** Returns true when anything ranked up (the caller plays a sound). */
export function liveProgressEvents(lp: LiveProgress, events: SimEvent[], world: World): boolean {
  const { xp, ups } = tallyEvents(lp.tally, events, world);
  if (xp) {
    pop(lp, `+${xp} XP`);
    drawStrip(lp);
  }
  for (const u of ups) banner(lp, u);
  return ups.length > 0;
}

/** Add `by` and return the new level if that crossed a threshold, else 0. */
function bump<K extends string>(counts: Partial<Record<K, number>>, k: K, levelOf: (n: number) => number, by = 1): number {
  const n = counts[k] ?? 0;
  counts[k] = n + by;
  return levelOf(n + by) > levelOf(n) ? levelOf(n + by) : 0;
}

function drawStrip(lp: LiveProgress): void {
  const lv = levelFor(lp.tally.xp);
  lp.strip.querySelector("b")!.textContent = `LV ${lv.level}`;
  lp.strip.querySelector<HTMLElement>("i")!.style.width = `${lv.next ? (lv.into / lv.next) * 100 : 100}%`;
}

function pop(lp: LiveProgress, text: string): void {
  const n = document.createElement("div");
  n.className = "xp-pop";
  n.textContent = text;
  lp.el.append(n);
  setTimeout(() => n.remove(), 1400);
}

function banner(lp: LiveProgress, u: RankUp): void {
  const n = document.createElement("div");
  n.className = `rank-up ${u.kind}`;
  n.setAttribute("role", "status");
  n.innerHTML = `<i class="badge"></i><div><b></b><span></span></div>`;
  n.querySelector(".badge")!.textContent = u.badge;
  n.querySelector("b")!.textContent = u.title;
  n.querySelector("span")!.textContent = u.sub;
  lp.el.querySelector(".rank-stack")!.append(n);
  setTimeout(() => n.remove(), 3200);
}
