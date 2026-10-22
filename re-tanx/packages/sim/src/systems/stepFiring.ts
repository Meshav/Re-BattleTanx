import type { World } from "../world.ts";
import type { SimEvent } from "../events.ts";
import type { GunKind, GunDef } from "../data/tankDefs.ts";
import type { Tank } from "../entities/tank.ts";
import { fireShell } from "../weapons/shell.ts";
import { fireHitscan } from "../weapons/hitscan.ts";
import { fireFlame } from "../weapons/flame.ts";
import { fireRocket } from "../weapons/rocket.ts";
import { fireMortar } from "../weapons/mortar.ts";
import { perkMods } from "../progression/perks.ts";
import { gunOf } from "../modes/rail.ts";

const guns: Record<GunKind, (w: World, t: Tank, g: GunDef) => SimEvent[]> = {
  shell: fireShell, hitscan: fireHitscan, laser: fireHitscan, flame: fireFlame, rocket: fireRocket, mortar: fireMortar,
};

export function stepFiring(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  for (const tank of world.tanks) {
    const gun = gunOf(world, tank);
    tank.cooldown = Math.max(0, tank.cooldown - world.dt);
    coolDown(tank, gun, world.dt);
    const wants = world.inputs[tank.id]?.fire;
    if (!tank.alive || !wants || tank.cooldown > 0 || tank.overheated > 0 || tank.fx.stun > 0) continue;
    tank.cooldown = gun.cooldown / perkMods(tank).fireRate;
    tank.fx.cloak = 0; // firing gives you away
    heatUp(tank, gun);
    events.push(...guns[gun.kind](world, tank, gun));
  }
  return events;
}

/** Laser heat: builds per shot, bleeds off over time; at 100 the gun locks for `overheat` seconds. */
function heatUp(tank: Tank, gun: GunDef): void {
  if (!gun.heatPerShot) return;
  tank.heat += gun.heatPerShot;
  if (tank.heat < 100) return;
  tank.heat = 100;
  tank.overheated = gun.overheat ?? 3;
}

function coolDown(tank: Tank, gun: GunDef, dt: number): void {
  tank.overheated = Math.max(0, tank.overheated - dt);
  tank.heat = Math.max(0, tank.heat - (gun.coolRate ?? 0) * dt * (tank.overheated > 0 ? 2 : 1)); // locked out = venting fast
}
