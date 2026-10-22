import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { applyDamage } from "./applyDamage.ts";
import { rules } from "../data/rules.ts";
import { tankDefs } from "../data/tankDefs.ts";

describe("respawn", () => {
  it("returns a dead tank after the delay at the spawn farthest from enemies", () => {
    const w = makeWorld(["S...S.......S"], [{ team: 0, kind: "m1" }, { team: 1, kind: "m1" }]);
    const [a, b] = [w.tanks[0]!, w.tanks[1]!];
    applyDamage(w, { target: a, amount: 999, sourceId: b.id, from: b.pos });
    run(w, Math.ceil(rules.respawnDelay * rules.tickRate) - 2);
    expect(a.alive).toBe(false);
    const events = run(w, 3);
    expect(a.alive).toBe(true);
    expect(a.hp).toBe(tankDefs.m1.hp);
    expect(a.pos.x).toBe(125);
    expect(events.some((e) => e.type === "spawn")).toBe(true);
  });
});
