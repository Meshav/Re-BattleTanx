import type { World } from "../world.ts";
import type { Tank } from "../entities/tank.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { rules } from "../data/rules.ts";
import { deg, turnToward, wrapAngle } from "../math/angle.ts";
import { clamp } from "../math/clamp.ts";
import { isRubbleAt } from "../queries/cells.ts";
import { idleInput, type InputState } from "../input.ts";
import { resolveWalls } from "./resolveWalls.ts";
import { activeGuided } from "../weapons/guided.ts";
import { carriedBy } from "../entities/queen.ts";
import { modeDefs, queenDefs } from "../data/modeDefs.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { perkMods } from "../progression/perks.ts";
import { moveOnRail, railOf } from "../modes/rail.ts";

function targetSpeed(world: World, tank: Tank, throttle: number): number {
  const def = tankDefs[tank.kind];
  const t = clamp(throttle, -1, 1);
  const top = t >= 0 ? def.speed : def.speed * def.reverse;
  const terrain = isRubbleAt(world, tank.pos) && !def.hover ? rules.rubbleSpeedFactor : 1;
  const boost = tank.fx.boost > 0 ? specialDefs.speed.factor : 1;
  return t * top * terrain * boost * perkMods(tank).speed * carryFactor(world, tank);
}

function carryFactor(world: World, tank: Tank): number {
  if (!carriedBy(world.queens, tank.id)) return 1;
  return (world.mode.kind === "holdEm" ? modeDefs.holdEm.carrySpeed : queenDefs.carrySpeed) * perkMods(tank).carrySpeed;
}

export function stepMovement(world: World): void {
  for (const tank of world.tanks) {
    if (!tank.alive) continue;
    const raw = world.inputs[tank.id] ?? idleInput(tank.turretRot);
    // while steering a guided missile the hull holds still (and is vulnerable)
    moveTank(world, tank, activeGuided(world, tank.id) ? { ...raw, throttle: 0, steer: 0 } : raw);
  }
}

/** One tank, one tick. Also used by online clients to predict their own tank. */
export function moveTank(world: World, tank: Tank, raw: InputState): void {
  const dt = world.dt;
  const def = tankDefs[tank.kind];
  const input = tank.fx.stun > 0 ? { ...raw, throttle: 0, steer: 0, strafe: 0 } : raw;
  const rail = railOf(world, tank.id);
  if (rail) return moveOnRail(world, tank, rail, input);
  tank.rot = wrapAngle(tank.rot + clamp(input.steer, -1, 1) * deg(def.turnRate) * dt);
  tank.turretRot = turnToward(tank.turretRot, input.aim, deg(def.turretRate) * dt);
  const accel = (def.speed / def.accelTime) * dt;
  const want = targetSpeed(world, tank, input.throttle);
  tank.speed += clamp(want - tank.speed, -accel * 2, accel);
  tank.pos.x += Math.cos(tank.rot) * tank.speed * dt;
  tank.pos.y += Math.sin(tank.rot) * tank.speed * dt;
  if (def.hover) strafe(tank, input.strafe, accel, dt);
  tank.stillFor = Math.abs(tank.speed) < 0.3 && Math.abs(tank.slide) < 0.3 ? tank.stillFor + dt : 0;
  resolveWalls(world, tank);
}

/** Hover tanks slide sideways (right of the hull = rot + 90°), with the same acceleration as forward. */
function strafe(tank: Tank, amount: number, accel: number, dt: number): void {
  const want = clamp(amount, -1, 1) * tankDefs[tank.kind].speed * 0.8;
  tank.slide += clamp(want - tank.slide, -accel * 2, accel);
  tank.pos.x += Math.cos(tank.rot + Math.PI / 2) * tank.slide * dt;
  tank.pos.y += Math.sin(tank.rot + Math.PI / 2) * tank.slide * dt;
}
