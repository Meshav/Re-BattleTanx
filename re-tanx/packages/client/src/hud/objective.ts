import type { Tank, World } from "@re-tanx/sim";
import { teamLabel } from "../app/results.ts";

import { teamCss } from "../render/teamColors.ts";
import { setHtml } from "./setHtml.ts";
import { names } from "@re-tanx/sim";

/** One line at the top: team scores vs the limit, plus your QueenLords' status in Battlelord. */
export function renderObjective(el: HTMLElement, world: World, me: Tank): void {
  if (world.campaign) return setHtml(el, campaignLine(world));
  if (world.horde) return setHtml(el, hordeLine(world));
  const teams = [...new Set(world.tanks.map((t) => t.team))].sort((a, b) => a - b);
  const m = world.mode;
  if (teams.length > 4 && m.kind !== "battlelord") return setHtml(el, ""); // FFA crowd: K/D panel says enough
  const fmt = (v: number) => (m.kind === "holdEm" ? Math.floor(v) : v);
  const parts = teams.map((t) => {
    const val = m.kind === "battlelord" ? `${world.queens.filter((q) => q.heldBy === t).length}♛` : fmt(m.scores[t] ?? 0);
    return `<b style="color:${teamCss(t)}">${teamLabel(world, t)}</b> ${typeof val === "number" ? Math.floor(val) : val}`;
  });
  const limit = m.scoreLimit > 0 && m.kind !== "battlelord" ? ` / ${m.scoreLimit}` : "";
  const round = m.round !== undefined ? ` · round ${m.round}${m.nextRoundIn! > 0 ? ` starts in ${Math.ceil(m.nextRoundIn!)}s` : ""}` : "";
  const cv = m.convoy;
  const convoyLine = cv ? ` · ${teamLabel(world, cv.protectors)} escorts · 🚚 ${cv.trucksLeft} · ${cv.roundLeft}s<div class="alert">${me.team === cv.protectors ? "Stay within 25 m of the trucks so they roll" : "Stop the trucks"}</div>` : "";
  const core = m.coreMax ? ` · core ${Math.round((m.coreHp! / m.coreMax) * 100)}%${me.team === 0 ? " — defend it" : " — destroy it"}` : "";
  const clock = m.timeLimit > 0 ? ` · ${Math.max(0, Math.ceil(m.timeLimit - m.elapsed))}s` : world.zone ? ` · zone moves in ${Math.ceil(world.zone.moveIn)}s` : "";
  setHtml(el, parts.join(" · ") + limit + (cv ? ` · round ${m.round}/2` : round) + convoyLine + core + clock + queenStatus(world, me));
}

function queenStatus(world: World, me: Tank): string {
  if (world.mode.kind !== "battlelord") return world.queens.some((q) => q.carrierId === me.id) ? `<div class="alert">You have the ${names.queen.one}!</div>` : "";
  const mine = world.queens.filter((q) => q.team === me.team);
  const lost = mine.filter((q) => q.state !== "home").length;
  const carrying = world.queens.some((q) => q.carrierId === me.id);
  if (carrying) return `<div class="alert">Carrying the ${names.queen.one} — get her to your fortress!</div>`;
  const rail = world.rails.find((r) => r.team === me.team);
  if (rail && rail.riderId === undefined && Math.hypot((rail.a.x + rail.b.x) / 2 - me.pos.x, rail.a.y - me.pos.y) < 25) return `<div class="alert">Park on the rail to man the rail cannon</div>`;
  return lost ? `<div class="alert danger">${lost} of your ${names.queen.many} taken</div>` : "";
}

function campaignLine(world: World): string {
  const c = world.campaign!;
  const items = c.mission.objectives.map((o, i) => {
    const st = c.objectives[i]!;
    const extra = o.kind === "survive" && !st.done ? ` (${Math.max(0, Math.ceil((o.seconds ?? 0) - c.elapsed))}s)` : "";
    return `<li class="${st.done ? "ok" : st.failed ? "failed" : ""}${o.optional ? " opt" : ""}">${st.done ? "✓" : st.failed ? "✗" : "○"} ${o.label}${extra}</li>`;
  }).join("");
  return `<div class="camp"><span>Score <b>${c.score}</b> · ${names.currency} <b class="bucks">${c.bucks}</b></span><ul>${items}</ul></div>`;
}

function hordeLine(world: World): string {
  const h = world.horde!;
  const left = world.tanks.filter((t) => t.team === 1 && t.alive).length;
  const status = h.wave === 0 ? "Get ready…" : left ? `${left} enemies left` : "Wave cleared — next one incoming";
  return `Wave <b>${h.wave}</b> / ${world.mode.scoreLimit} · Lives <b>${Math.max(0, h.lives)}</b> · ${status}`;
}
