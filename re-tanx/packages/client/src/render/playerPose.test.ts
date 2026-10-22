import { expect, it } from "vitest";
import { createWorld, idleInput, parseMap, stepWorld, tankDefs } from "@re-tanx/sim";
import { playerPose } from "./playerPose.ts";

const makeWorld = () => createWorld(parseMap({ id: "test", name: "test", cell: 10, rows: [".....", ".S#..", "....."] }), [{ team: 0, kind: "m1" }]);

it("responds to fresh input before the next tick without changing world or replay state", () => {
  const world = makeWorld(), me = world.tanks[0]!;
  const before = structuredClone(world);
  const pose = playerPose(world, me, { ...idleInput(), throttle: 1, steer: 1, aim: 1 }, 0.5);
  expect(pose.x).toBeGreaterThan(me.pos.x);
  expect(pose.rot).toBeGreaterThan(me.rot);
  expect(pose.turretRot).toBeGreaterThan(me.turretRot);
  expect(world).toEqual(before);
  world.inputs[me.id] = { ...idleInput(), throttle: 1, steer: 1, aim: 1 };
  stepWorld(world);
  expect(playerPose(world, me, idleInput(), 0).x).toBe(me.pos.x);
});

it("respects walls, stun and dead tanks during visual prediction", () => {
  const world = makeWorld(), me = world.tanks[0]!;
  me.pos.x = 20 - tankDefs[me.kind].radius;
  me.speed = tankDefs[me.kind].speed;
  const drive = { ...idleInput(), throttle: 1, steer: 1 };
  expect(playerPose(world, me, { ...drive, steer: 0 }, 1).x).toBeLessThanOrEqual(me.pos.x);
  me.fx.stun = 1;
  expect(playerPose(world, me, drive, 0.8).rot).toBe(me.rot);
  me.alive = false;
  expect(playerPose(world, me, drive, 0.8)).toEqual({ x: me.pos.x, y: me.pos.y, rot: me.rot, turretRot: me.turretRot });
});
