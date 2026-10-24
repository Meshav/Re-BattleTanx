import { activeGuided, maxHp, modeRules, tankDefs, tankName, type SimEvent, type SpecialKind, type Tank, type World } from "@re-tanx/sim";
import { renderSpecials } from "./specials.ts";
import { renderRoster } from "./roster.ts";
import { drawMinimap } from "./minimap.ts";
import { pushKills, type KillFeed } from "./killFeed.ts";
import { renderObjective } from "./objective.ts";
import { renderCountdown } from "./countdown.ts";
import { settings } from "../settings/settings.ts";

/** DOM overlay. Built once; update() only touches text, widths and the radar canvas. */
export interface Hud {
  hpFill: HTMLElement; hpBar: HTMLElement; hpText: HTMLElement; shieldFill: HTMLElement;
  score: HTMLElement; center: HTMLElement; specials: HTMLElement; roster: HTMLElement;
  minimap: HTMLCanvasElement; feed: KillFeed; flash: HTMLElement; objective: HTMLElement; lastSpecials: string; lastRoster: string;
  heatBar: HTMLElement; heatFill: HTMLElement; status: HTMLElement; boss: HTMLElement; bossName: HTMLElement; bossFill: HTMLElement;
  countdown: HTMLElement; nextUpdate: number;
  /** live weapon XP for V-level badges (the profile owner, when upgrades are on) */
  weaponXp?: Partial<Record<SpecialKind, number>>;
}

export function createHud(root: HTMLElement, names: (id: number) => string): Hud {
  root.innerHTML = `
    <div class="hud-panel hud-help">WASD drive · Mouse aim · Click fire · Right-click/F special · Q/E cycle · V camera<br>Guided missile: A/D steer it</div>
    <div class="hud-panel hud-score" data-score></div>
    <div class="hud-objective" data-objective></div>
    <div class="hud-boss hidden" data-boss><span data-boss-name></span><div class="bar"><i data-boss-fill></i></div></div>
    <canvas class="hud-minimap" data-minimap aria-label="Radar"></canvas>
    <div class="hud-feed" data-feed></div>
    <div class="hud-panel hud-roster" data-roster></div>
    <div class="hud-panel hud-health"><span data-hp-text></span>
      <div class="bar" data-hp-bar><i data-hp-fill></i></div>
      <div class="bar shield"><i data-shield-fill></i></div>
      <div class="bar heat hidden" data-heat-bar><i data-heat-fill></i></div>
      <div class="status" data-status></div>
      <div class="hud-specials" data-specials></div></div>
    <div class="hud-center hidden" data-center></div>
    <div class="hud-countdown hidden" data-countdown><div class="cd-title"></div><div class="cd-digit"></div></div>
    <div class="hud-flash" data-flash></div>`;
  const q = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(`[${s}]`)!;
  return {
    nextUpdate: 0,
    hpFill: q("data-hp-fill"), hpBar: q("data-hp-bar"), hpText: q("data-hp-text"), shieldFill: q("data-shield-fill"),
    score: q("data-score"), center: q("data-center"), specials: q("data-specials"), roster: q("data-roster"),
    minimap: q<HTMLCanvasElement>("data-minimap"), feed: { el: q("data-feed"), lines: [], names }, flash: q("data-flash"), objective: q("data-objective"),
    lastSpecials: "", lastRoster: "", heatBar: q("data-heat-bar"), heatFill: q("data-heat-fill"), status: q("data-status"),
    boss: q("data-boss"), bossName: q("data-boss-name"), bossFill: q("data-boss-fill"), countdown: q("data-countdown"),
  };
}

export function hudEvents(h: Hud, events: SimEvent[], world: World): void {
  pushKills(h.feed, events, world);
  if (events.some((e) => e.type === "nukeDetonate") && !settings().reducedMotion) {
    h.flash.classList.remove("on");
    void h.flash.offsetWidth; // restart the CSS animation
    h.flash.classList.add("on");
  }
}

export function updateHud(h: Hud, me: Tank, world: World): void {
  const now = performance.now();
  if (now < h.nextUpdate) return;
  h.nextUpdate = now + 50; // HUD/radar at 20 Hz; tank and camera still render every frame.
  const max = maxHp(me);
  const pct = Math.max(0, me.hp / max);
  h.hpFill.style.width = `${pct * 100}%`;
  h.hpBar.classList.toggle("low", pct < 0.3);
  h.shieldFill.style.width = `${Math.min(100, me.shield)}%`;
  h.hpText.textContent = `${tankName(me.kind).toUpperCase()}  ${Math.ceil(me.hp)} / ${max}`;
  const usesHeat = tankDefs[me.kind].gun.heatPerShot !== undefined;
  h.heatBar.classList.toggle("hidden", !usesHeat);
  h.heatBar.classList.toggle("low", me.overheated > 0);
  h.heatFill.style.width = `${me.heat}%`;
  h.status.textContent = statusLine(me);
  h.score.textContent = `Kills ${me.kills}  ·  Deaths ${me.deaths}`;
  const sKey = JSON.stringify([me.specials, me.selected, h.weaponXp]);
  if (sKey !== h.lastSpecials) {
    renderSpecials(h.specials, me, h.weaponXp);
    h.lastSpecials = sKey;
  }
  const rKey = `${me.gang}${me.rosterIndex}${me.roster.join()}`;
  if (rKey !== h.lastRoster) {
    renderRoster(h.roster, me);
    h.lastRoster = rKey;
  }
  const nuke = world.nukes[0];
  const msg = !me.alive ? deadLine(world, me)
    : activeGuided(world, me.id) ? "Steering missile — A/D" : world.rails.some((r) => r.riderId === me.id) ? "RAIL CANNON — W/S slide · hold a hard turn to hop off" : nuke ? `☢ NUKE ${nuke.fuse.toFixed(1)}s` : "";
  h.center.classList.toggle("hidden", !msg);
  h.center.textContent = msg;
  drawMinimap(h.minimap, world, me);
  renderBoss(h, world);
  renderObjective(h.objective, world, me);
  renderCountdown(h.countdown, world);
}

const STATUS: [keyof Tank["fx"], string][] = [["burn", "🔥 burning"], ["stun", "⚡ stunned"], ["cloak", "👁 cloaked"], ["boost", "» boost"], ["repair", "+ repairing"]];

function statusLine(me: Tank): string {
  const on = STATUS.filter(([k]) => me.fx[k] > 0).map(([, label]) => label);
  if (me.overheated > 0) on.push("OVERHEATED");
  return on.join(" · ");
}

/** Big health bar while a boss lives; the phase shows in the label. */
function renderBoss(h: Hud, world: World): void {
  const b = world.bosses.find((k) => world.tanks.find((t) => t.id === k.tankId)?.alive);
  h.boss.classList.toggle("hidden", !b);
  if (!b) return;
  const t = world.tanks.find((k) => k.id === b.tankId)!;
  h.bossName.textContent = `${t.name.toUpperCase()} — phase ${b.phase + 1} / 3`;
  h.bossFill.style.width = `${(t.hp / tankDefs[t.kind].hp) * 100}%`;
}

function deadLine(world: World, me: Tank): string {
  if (world.mode.round !== undefined) return "Destroyed — out until the next round";
  if (!modeRules[world.mode.kind].canRespawn(world, me)) return "Out of tanks — spectating";
  return `Destroyed — redeploying in ${Math.max(0, me.respawnIn).toFixed(1)}s`;
}
