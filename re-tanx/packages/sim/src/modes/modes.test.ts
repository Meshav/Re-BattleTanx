import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { applyDamage } from "../systems/applyDamage.ts";
import { rules } from "../data/rules.ts";
import type { World } from "../world.ts";

const field = ["S.........S", "...........", "S.........S"];
const killTank = (w: World, victim: number, killer: number) => {
  const v = w.tanks[victim]!;
  w.recentEvents = applyDamage(w, { target: v, amount: 9999, sourceId: w.tanks[killer]!.id, from: v.pos });
};

describe("deathmatch", () => {
  it("scores kills that happen during a tick", () => {
    const w = makeWorld(["S...S"], [{ team: 0, kind: "goliath" }, { team: 1, kind: "moto" }], { mode: { kind: "deathmatch", scoreLimit: 1 } });
    const [a, b] = [w.tanks[0]!, w.tanks[1]!];
    b.hp = 1;
    b.rot = Math.PI;
    const events = run(w, 30, { [a.id]: { fire: true } });
    expect(w.mode.scores[0]).toBe(1);
    expect(w.mode.over).toBe(true);
    expect(w.mode.winner).toBe(0);
    expect(events.at(-1)).toEqual({ type: "matchOver", winner: 0 });
    const frozenTick = w.tick;
    run(w, 10);
    expect(w.tick).toBe(frozenTick);
  });

  it("a time limit ends on the leader, or a draw when tied", () => {
    const w = makeWorld(field, [{ team: 0, kind: "m1" }, { team: 1, kind: "m1" }], { mode: { kind: "deathmatch", timeLimit: 1 } });
    run(w, 31);
    expect(w.mode.over).toBe(true);
    expect(w.mode.winner).toBe(-1);
  });
});

describe("annihilation", () => {
  it("the roster is your lives; last team with tanks wins", () => {
    const w = makeWorld(field, [{ team: 0, gang: "rustSaints" }, { team: 1, gang: "boneRiders" }], { mode: { kind: "annihilation" } });
    const victim = w.tanks[1]!;
    for (let life = 0; life < 5; life++) {
      killTank(w, 1, 0);
      w.pickups = [];
      run(w, rules.respawnDelay * 30 + 2);
      if (w.mode.over) break;
    }
    expect(victim.deaths).toBe(5);
    expect(victim.alive).toBe(false);
    expect(w.mode.winner).toBe(0);
  });
});
