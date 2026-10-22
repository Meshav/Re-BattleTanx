import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { createLagComp, MAX_REWIND_TICKS } from "./lagComp.ts";
import { createRecorder, playReplay, quantizeInput } from "../replay/replay.ts";
import { stepWorld } from "../stepWorld.ts";
import { tankDefs } from "../data/tankDefs.ts";

const range = ["S...............................", "................................", "................................", "S..............................."];

/** A moto (hitscan) aims east at a target that then drives out of the line of fire. */
function setup(lag: boolean) {
  const w = makeWorld(range, [{ team: 0, kind: "moto" }, { team: 1, kind: "moto" }]);
  if (lag) w.lagComp = createLagComp();
  const [shooter, target] = [w.tanks[0]!, w.tanks[1]!];
  shooter.pos = { x: 15, y: 15 };
  shooter.rot = shooter.turretRot = 0;
  target.pos = { x: 60, y: 15 };
  target.rot = Math.PI / 2; // drives "down", across the line of fire, already at full speed
  target.speed = tankDefs.moto.speed;
  run(w, 1, { [shooter.id]: { aim: 0 }, [target.id]: { throttle: 1 } });
  const seen = w.tick; // the tick the shooter's screen shows
  run(w, 7, { [shooter.id]: { aim: 0 }, [target.id]: { throttle: 1 } }); // target has moved on by now
  return { w, shooter, target, seen };
}

describe("hitscan lag compensation", () => {
  it("without it, a shot at where you saw the target misses", () => {
    const { w, shooter, target } = setup(false);
    const hp = target.hp;
    run(w, 1, { [shooter.id]: { aim: 0, fire: true } });
    expect(target.hp).toBe(hp);
  });

  it("with it, the server rewinds the target to the tick you saw and the shot lands; the target ends up back where it is", () => {
    const { w, shooter, target, seen } = setup(true);
    const hp = target.hp;
    w.lagComp!.view[shooter.id] = seen;
    const before = { ...target.pos };
    run(w, 1, { [shooter.id]: { aim: 0, fire: true } });
    expect(target.hp).toBeLessThan(hp);
    expect(target.pos.y).toBeGreaterThanOrEqual(before.y); // restored (and moved on), not left in the past
  });

  it("claims older than the rewind window are clamped, so lag can't be abused", () => {
    const { w, shooter, target } = setup(true);
    run(w, MAX_REWIND_TICKS + 4, { [target.id]: { throttle: 1 } });
    const hp = target.hp;
    w.lagComp!.view[shooter.id] = 0; // "I saw it ages ago"
    run(w, 1, { [shooter.id]: { aim: 0, fire: true } });
    expect(target.hp).toBe(hp);
  });

  it("replays of lag-compensated matches re-simulate exactly", () => {
    const slots = [{ team: 0, kind: "moto" as const }, { team: 1, kind: "m1" as const, bot: "hard" as const }];
    const live = makeWorld(range, slots, { seed: 9 });
    live.lagComp = createLagComp();
    const rec = createRecorder({ map: "test", slots, opts: { seed: 9 }, lagComp: true, customMap: { id: "test", name: "test", cell: 10, rows: range } }, 1);
    for (let t = 0; t < 300; t++) {
      const id = live.tanks[0]!.id;
      live.inputs[id] = quantizeInput({ throttle: 0.4, steer: Math.sin(t / 20), strafe: 0, aim: t / 30, fire: t % 4 === 0, special: false, cycle: 0 });
      live.lagComp.view[id] = live.tick - (t % 5);
      rec.record(live);
      stepWorld(live);
    }
    const pb = playReplay(JSON.parse(JSON.stringify(rec.finish(live))));
    while (!pb.done) pb.step();
    expect(pb.world.tanks.map((t) => [t.pos.x, t.pos.y, t.hp])).toEqual(live.tanks.map((t) => [t.pos.x, t.pos.y, t.hp]));
  });
});
