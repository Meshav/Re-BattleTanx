import type { BotInput } from "../context.ts";
import type { BotCtx } from "../context.ts";
import { driveTo } from "../steering.ts";
import { angleOf, dist, sub } from "../../math/vec2.ts";
import { tankDefs } from "../../data/tankDefs.ts";
import { wrapAngle } from "../../math/angle.ts";
import { gunnery } from "../combat.ts";
import { objectiveGoal } from "../objectiveGoal.ts";
import { gunOf } from "../../modes/rail.ts";

/** QueenLord modes: grab, deliver, rescue, defend, chase carriers. Shoots whatever it sees on the way. */
export const objective = {
  score: (ctx: BotCtx): number => objectiveGoal(ctx.world, ctx.tank)?.urgency ?? 0,
  act(ctx: BotCtx): BotInput {
    const { world, tank, bot } = ctx;
    const goal = objectiveGoal(world, tank);
    if (!goal) return { throttle: 0, steer: 0, aim: tank.turretRot, fire: false, special: false, cycle: 0 };
    const chased = world.tanks.find((t) => t.id === goal.chaseId);
    const g = chased && !ctx.target ? { ...ctx, target: chased } : ctx;
    const drive = driveTo(world, tank, bot, goal.pos);
    const toGoal = angleOf(sub(goal.pos, tank.pos));
    const gun = gunnery(g, toGoal);
    // Siege attackers pound the core when nothing else needs shooting
    const shootGoal = goal.shoot && !g.target && dist(goal.pos, tank.pos) <= gunOf(world, tank).range;
    return { ...drive, ...gun, fire: gun.fire || (shootGoal === true && Math.abs(wrapAngle(tank.turretRot - toGoal)) < 0.15), special: false, cycle: 0 };
  },
};
