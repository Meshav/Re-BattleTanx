import { deployCost, isUnlocked, levelFor, progressionDefs, tankDefs, tankKinds, type TankKind, type World } from "@re-tanx/sim";
import type { LocalPlayer } from "../localPlayer.ts";
import { loadProfile } from "../profile/localProfile.ts";
import { names, tankName } from "@re-tanx/sim";

const BLURB: Record<TankKind, string> = {
  moto: "Fast, fragile, twin machine guns.",
  m1: "All-rounder. Cannon, solid armor.",
  goliath: "Slow, heavy armor, big splash cannon.",
  hover: "Strafes, glides over rubble, thin skin.",
  inferno: "Flamethrower. Sets tanks burning.",
  rattler: "Homing rocket pods. Fast.",
  rhino: "Huge armor, plow ram.",
  flpe: "Laser. Watch the heat.",
  sentinel: "Mortar over walls. Park it for range.",
  warlord: "",
  truck: "",
};

export interface DeployOpts { title: string; bucks: number; cost(k: TankKind): number; autoSeconds?: number; preferred?: TankKind; level: number }

const unlockLevel = (k: TankKind): number => Number(Object.entries(progressionDefs.unlocks).find(([, keys]) => keys.includes(`tank:${k}`))?.[0] ?? 1);

/** Pick a tank to buy with Tank Bucks. With autoSeconds it picks for you (gamepad players, impatient players). */
export function renderDeploy(el: HTMLElement, o: DeployOpts, onPick: (k: TankKind) => void): () => void {
  const can = (k: TankKind) => o.cost(k) <= o.bucks && isUnlocked(o.level, `tank:${k}`);
  el.innerHTML = `<div class="card deploy"><h2>${o.title}</h2><p class="muted">${names.currency}: <b class="bucks">${o.bucks}</b></p>
    <div class="tanks">${tankKinds.map((k) => {
      const d = tankDefs[k];
      return `<button type="button" data-k="${k}"${can(k) ? "" : " disabled"}><b>${tankName(k).toUpperCase()}</b>
        <span class="small">${BLURB[k]}</span><span class="small muted">HP ${d.hp} · armor ${d.armor} · ${d.speed} m/s</span>
        <span class="cost">${isUnlocked(o.level, `tank:${k}`) ? `${o.cost(k)} ⓑ` : `🔒 Lv ${unlockLevel(k)}`}</span></button>`;
    }).join("")}</div><p class="muted small" data-auto></p></div>`;
  let done = false;
  const pick = (k: TankKind) => {
    if (done || !can(k)) return;
    done = true;
    clearInterval(timer);
    onPick(k);
  };
  el.querySelectorAll<HTMLButtonElement>("[data-k]").forEach((b) => b.addEventListener("click", () => pick(b.dataset.k as TankKind)));
  const fallback = (o.preferred && can(o.preferred) ? o.preferred : undefined) ?? tankKinds.filter(can).sort((a, b) => o.cost(a) - o.cost(b))[0];
  el.querySelector<HTMLButtonElement>(`[data-k="${fallback}"]`)?.focus();
  let left = o.autoSeconds ?? 0;
  const auto = el.querySelector<HTMLElement>("[data-auto]")!;
  const timer = setInterval(() => {
    if (!o.autoSeconds || !fallback) return;
    left--;
    auto.textContent = `Auto-deploying ${tankName(fallback).toUpperCase()} in ${left}s`;
    if (left <= 0) pick(fallback);
  }, 1000);
  return () => {
    done = true;
    clearInterval(timer);
  };
}

/** Mid-mission: a dead player gets the deploy screen in their viewport (auto-picks after 8 s). `onPick` buys locally or asks the server. */
export function redeployPrompt(lp: LocalPlayer, w: World, open: Map<number, () => void>, onPick: (k: TankKind) => void): void {
  const c = w.campaign!;
  const id = lp.tank.id;
  const wrap = lp.hudRoot.querySelector<HTMLElement>(".deploy-wrap");
  const needs = !lp.tank.alive && c.pendingDeploy[id] === undefined && c.outcome === "playing" && lp.tank.respawnIn <= 0.5;
  if (!needs) {
    if (wrap) wrap.remove();
    open.get(id)?.();
    open.delete(id);
    return;
  }
  if (wrap) return;
  const el = document.createElement("div");
  el.className = "deploy-wrap";
  lp.hudRoot.appendChild(el);
  open.set(id, renderDeploy(el, { title: "Redeploy", bucks: c.bucks, cost: (k) => deployCost(c, k), autoSeconds: 8, preferred: lp.tank.kind, level: levelFor(loadProfile().xp).level }, onPick));
}
