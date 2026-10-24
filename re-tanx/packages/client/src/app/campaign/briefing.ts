import { bindLoadout, loadoutDetails } from "../profile/loadoutPicker.ts";
import type { MissionDef } from "@re-tanx/sim";

/** Story card + objectives before a mission. */
export function showBriefing(host: HTMLElement, m: MissionDef, index: number, hooks: { onContinue(): void; onBack(): void }): void {
  const objectives = m.objectives.map((o) => `<li class="${o.optional ? "muted" : ""}">${o.optional ? "Bonus: " : ""}${o.label}</li>`).join("");
  host.innerHTML = `<div class="overlay brief"><div class="card wide story">
    <p class="muted small">MISSION ${index + 1} · ${m.location.toUpperCase()}</p>
    <h1>${m.title}</h1>
    ${m.brief.map((p) => `<p>${p}</p>`).join("")}
    <h3>Objectives</h3><ul class="objectives">${objectives}</ul>
    ${loadoutDetails()}
    <div class="row"><button data-go>Choose your tank</button><button class="secondary" data-back>Back</button></div>
  </div></div>`;
  bindLoadout(host);
  host.querySelector("[data-go]")!.addEventListener("click", hooks.onContinue);
  host.querySelector("[data-back]")!.addEventListener("click", hooks.onBack);
  host.querySelector<HTMLButtonElement>("[data-go]")!.focus();
}
