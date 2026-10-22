import { gangDefs, type Tank, type TankKind } from "@re-tanx/sim";

export const TANK_SHORT: Record<TankKind, string> = { moto: "Sc", m1: "Rg", goliath: "Bh", hover: "Sk", inferno: "To", rattler: "Vi", rhino: "Rm", flpe: "La", sentinel: "Hw", warlord: "W", truck: "Tr" };

/** Gang name and the five-tank roster with the current one marked. */
export function renderRoster(el: HTMLElement, me: Tank): void {
  const name = me.gang ? gangDefs[me.gang].name : "Freelancer";
  const pips = me.roster.map((k, i) => `<i class="pip${i === me.rosterIndex ? " cur" : i < me.rosterIndex ? " used" : ""}" title="${k}">${TANK_SHORT[k]}</i>`).join("");
  el.innerHTML = `<div class="gang">${name}</div><div class="pips">${pips}</div>`;
}
