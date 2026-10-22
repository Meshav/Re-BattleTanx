import type { World } from "../world.ts";
import type { Tank } from "../entities/tank.ts";
import type { Rail } from "../entities/rail.ts";
import type { SimEvent } from "../events.ts";
import type { InputState } from "../input.ts";
import type { GunDef } from "../data/tankDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { modeDefs } from "../data/modeDefs.ts";
import { blocksTank, cellOf } from "../queries/cells.ts";
import { carriedBy } from "../entities/queen.ts";
import { clamp } from "../math/clamp.ts";
import { deg, turnToward } from "../math/angle.ts";
import type { Vec2 } from "../math/vec2.ts";

const def = modeDefs.battlelord.rail;
export const railGun = def.gun as GunDef;

/** One straight track per fortress, on the row just beside it (the fortress cell holds the queens). */
export function addRails(world: World): void {
  const { cell } = world.map;
  world.map.fortresses.forEach((f, team) => {
    const { cx, cy } = cellOf(world, f);
    const row = [cy + 1, cy - 1].find((r) => !blocksTank(world, cx, r, false));
    if (row === undefined) return;
    let lo = cx, hi = cx;
    while (cx - lo < def.halfCells && !blocksTank(world, lo - 1, row, false)) lo--;
    while (hi - cx < def.halfCells && !blocksTank(world, hi + 1, row, false)) hi++;
    if (hi - lo < 2) return; // too cramped for a track
    const y = (row + 0.5) * cell;
    world.rails.push({ id: world.nextId++, team, a: { x: (lo + 0.5) * cell, y }, b: { x: (hi + 0.5) * cell, y }, riderId: undefined, turnHeld: 0 });
  });
}

export const railOf = (world: World, tankId: number): Rail | undefined => world.rails.find((r) => r.riderId === tankId);

/** Closest point on the track to p. */
function project(r: Rail, p: Vec2): Vec2 {
  const dx = r.b.x - r.a.x, dy = r.b.y - r.a.y;
  const t = clamp(((p.x - r.a.x) * dx + (p.y - r.a.y) * dy) / (dx * dx + dy * dy), 0, 1);
  return { x: r.a.x + dx * t, y: r.a.y + dy * t };
}

/** Riding: the hull is locked to the track, throttle slides it, the turret aims freely. Also used for client prediction. */
export function moveOnRail(world: World, tank: Tank, r: Rail, input: InputState): void {
  const dt = world.dt;
  tank.rot = Math.atan2(r.b.y - r.a.y, r.b.x - r.a.x);
  tank.turretRot = turnToward(tank.turretRot, input.aim, deg(tankDefs.goliath.turretRate) * dt);
  tank.speed += clamp(clamp(input.throttle, -1, 1) * def.speed - tank.speed, -def.speed * dt * 3, def.speed * dt * 3);
  const p = project(r, { x: tank.pos.x + Math.cos(tank.rot) * tank.speed * dt, y: tank.pos.y + Math.sin(tank.rot) * tank.speed * dt });
  if ((p.x === r.a.x && p.y === r.a.y) || (p.x === r.b.x && p.y === r.b.y)) tank.speed = 0; // end stop
  tank.pos = p;
  tank.stillFor = 0; // so hopping off doesn't instantly re-mount
}

/** Mount (park on the track for a moment), dismount (humans: hold a hard turn), and free the gun when the rider dies. */
export function stepRails(world: World): SimEvent[] {
  const events: SimEvent[] = [];
  for (const r of world.rails) {
    const rider = world.tanks.find((t) => t.id === r.riderId);
    if (r.riderId !== undefined && !rider?.alive) {
      r.riderId = undefined;
      continue;
    }
    if (rider) {
      const steer = Math.abs(world.inputs[rider.id]?.steer ?? 0);
      r.turnHeld = steer >= 0.9 && !world.bots[rider.id] ? r.turnHeld + world.dt : 0; // bots never hop off
      if (r.turnHeld < def.dismountSeconds) continue;
      r.riderId = undefined;
      r.turnHeld = 0;
      rider.rot += Math.PI / 2; // face off the track so the next tick drives clear
      events.push({ type: "rail", what: "dismount", tankId: rider.id });
      continue;
    }
    const mount = world.tanks.find((t) => t.alive && t.team === r.team && t.stillFor >= def.mountSeconds && !railOf(world, t.id)
      && !carriedBy(world.queens, t.id) && Math.hypot(project(r, t.pos).x - t.pos.x, project(r, t.pos).y - t.pos.y) <= def.mountRange);
    if (!mount) continue;
    r.riderId = mount.id;
    mount.pos = project(r, mount.pos);
    mount.speed = 0;
    events.push({ type: "rail", what: "mount", tankId: mount.id });
  }
  return events;
}

/** The gun a tank fires right now: the rail Goliath's while riding. */
export const gunOf = (world: World, tank: Tank): GunDef => (railOf(world, tank.id) ? railGun : tankDefs[tank.kind].gun);

/** Incoming damage multiplier from the rail car's plating. */
export const railArmor = (world: World, tank: Tank): number => (railOf(world, tank.id) ? def.damageTaken : 1);
