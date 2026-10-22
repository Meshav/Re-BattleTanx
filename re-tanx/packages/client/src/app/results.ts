import { gangDefs, tankDefs, type World } from "@re-tanx/sim";
import { MODE_SHORT } from "./modeLabels.ts";
import type { MatchResult } from "@re-tanx/sim";
import { xpPanel } from "./profile/xpPanel.ts";

import { teamName } from "../render/teamColors.ts";

export function teamLabel(world: World, team: number): string {
  const members = world.tanks.filter((t) => t.team === team);
  return members.length === 1 ? members[0]!.name : `${teamName(team)} team`;
}

/** Post-match scoreboard with rematch / menu. */
export function showResults(host: HTMLElement, world: World, hooks: { onRematch(): void; onMenu(): void; rematchLabel?: string; xp?: MatchResult; replay?: ReplayHooks }): void {
  const w = world.mode.winner;
  const banner = world.horde ? (w === 0 ? `Survived all ${world.horde.wave} waves` : `Overrun on wave ${world.horde.wave}`) : w === undefined || w < 0 ? "Draw" : `${teamLabel(world, w)} wins`;
  const rows = world.tanks.filter((t) => tankDefs[t.kind].class !== "convoy").sort((a, b) => b.kills - a.kills || a.deaths - b.deaths).map((t) => `
    <tr class="${t.team === w ? "win" : ""}"><td>${t.name}${world.bots[t.id] ? ' <span class="muted">bot</span>' : ""}</td>
    <td>${t.gang ? gangDefs[t.gang].name : "—"}</td><td>${t.kills}</td><td>${t.deaths}</td></tr>`).join("");
  host.innerHTML = `<div class="overlay"><div class="card wide">
    <h1>${banner}</h1><p class="muted">${MODE_SHORT[world.mode.kind]} · ${Math.round(world.mode.elapsed)}s</p>
    <table class="score"><thead><tr><th>Player</th><th>Gang</th><th>Kills</th><th>Deaths</th></tr></thead><tbody>${rows}</tbody></table>
    ${hooks.xp ? xpPanel(hooks.xp) : ""}
    <div class="row"><button data-rematch${hooks.rematchLabel ? " disabled" : ""}>${hooks.rematchLabel ?? "Rematch"}</button><button data-menu class="secondary">Menu</button>${replayButtons(hooks.replay)}</div>
  </div></div>`;
  host.querySelector("[data-rematch]")!.addEventListener("click", hooks.onRematch);
  host.querySelector("[data-menu]")!.addEventListener("click", hooks.onMenu);
  bindReplayButtons(host, hooks.replay);
  host.querySelector<HTMLButtonElement>(hooks.rematchLabel ? "[data-menu]" : "[data-rematch]")!.focus();
}

export interface ReplayHooks { watch?(): void; download(): void }

export const replayButtons = (r: ReplayHooks | undefined): string =>
  r ? `${r.watch ? `<button data-watch class="secondary">Watch replay</button>` : ""}<button data-save class="secondary">Save replay</button>` : "";

export function bindReplayButtons(host: HTMLElement, r: ReplayHooks | undefined): void {
  if (!r) return;
  if (r.watch) host.querySelector("[data-watch]")?.addEventListener("click", r.watch);
  host.querySelector("[data-save]")?.addEventListener("click", r.download);
}
