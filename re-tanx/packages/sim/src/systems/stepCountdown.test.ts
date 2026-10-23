import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { rules } from "../data/rules.ts";
import { createRecorder, playReplay } from "../replay/replay.ts";
import { stepWorld } from "../stepWorld.ts";

const open = ["..........", ".S......S.", ".........."];
const total = rules.countdown.beats * rules.countdown.beatTicks;
const slots = [{ team: 0, kind: "m1" as const }, { team: 1, kind: "m1" as const, bot: "hard" as const }];

describe("stepCountdown", () => {
  it("holds the world still, one event per beat, then plays", () => {
    const w = makeWorld(open, slots, { mode: { kind: "deathmatch", countdown: true } });
    const [me, bot] = w.tanks;
    const start = { ...me!.pos }, botStart = { ...bot!.pos };
    const events = run(w, total, { [me!.id]: { throttle: 1, fire: true } });
    expect(events.filter((e) => e.type === "countdown").map((e) => e.type === "countdown" && e.left)).toEqual([4, 3, 2, 1, 0]);
    expect(events.some((e) => e.type === "fire")).toBe(false);
    expect(me!.pos).toEqual(start);
    expect(bot!.pos).toEqual(botStart);
    expect(w.mode.elapsed).toBe(0);
    expect(w.mode.countdown).toBe(0);
    run(w, 10, { [me!.id]: { throttle: 1 } });
    expect(me!.pos).not.toEqual(start);
  });

  it("is off unless asked for", () => {
    const w = makeWorld(open, slots);
    expect(w.mode.countdown).toBeUndefined();
    expect(run(w, 5).some((e) => e.type === "countdown")).toBe(false);
  });

  it("replays bit-identically", () => {
    const w = makeWorld(open, slots, { seed: 7, mode: { kind: "deathmatch", countdown: true } });
    const rec = createRecorder({ map: "test", slots, opts: { seed: 7, mode: { kind: "deathmatch", countdown: true } }, customMap: { id: "test", name: "test", cell: 10, rows: open } }, 1);
    for (let t = 0; t < total + 60; t++) {
      w.inputs[w.tanks[0]!.id] = { throttle: 1, steer: t > total ? 0.5 : 0, strafe: 0, aim: 0, fire: t % 20 === 0, special: false, cycle: 0 };
      rec.record(w);
      stepWorld(w);
    }
    const pb = playReplay(rec.finish(w));
    while (!pb.done) pb.step();
    expect(pb.world.tanks.map((t) => t.pos)).toEqual(w.tanks.map((t) => t.pos));
  });
});
