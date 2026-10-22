import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { modeDefs } from "../data/modeDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { applyDamage } from "../systems/applyDamage.ts";
import type { World } from "../world.ts";

// a: team 0 fortress (left), b: team 1 fortress (right)
const field = ["S.a........b.S", "..............", "S............S"];
const tankAt = (w: World, i: number, pos: { x: number; y: number }) => Object.assign(w.tanks[i]!, { pos: { ...pos }, speed: 0 });

describe("battlelord", () => {
  const make = () => makeWorld(field, [{ team: 0, kind: "m1" }, { team: 1, kind: "m1" }], { mode: { kind: "battlelord" } });

  it("puts each team's queens at its fortress", () => {
    const w = make();
    expect(w.queens.filter((q) => q.team === 0)).toHaveLength(modeDefs.battlelord.queensPerTeam);
    expect(w.queens.every((q) => q.state === "home")).toBe(true);
  });

  it("steal → carry home → captive; the owner can rescue her back", () => {
    const w = make();
    const q = w.queens.find((k) => k.team === 1)!;
    tankAt(w, 0, q.pos);
    run(w, 1);
    expect(q.state).toBe("carried");
    tankAt(w, 0, w.map.fortresses[0]!);
    run(w, 1);
    expect(q).toMatchObject({ state: "held", heldBy: 0 });
    tankAt(w, 0, { x: 70, y: 25 });
    tankAt(w, 1, q.pos);
    run(w, 1);
    expect(q.carrierId).toBe(w.tanks[1]!.id);
    tankAt(w, 1, w.map.fortresses[1]!);
    run(w, 1);
    expect(q.state).toBe("home");
  });

  it("a carrier's death drops her; she goes home when the owner touches her", () => {
    const w = make();
    const q = w.queens.find((k) => k.team === 1)!;
    tankAt(w, 0, q.pos);
    run(w, 1);
    tankAt(w, 0, { x: 60, y: 15 });
    run(w, 1);
    applyDamage(w, { target: w.tanks[0]!, amount: 999, sourceId: w.tanks[1]!.id, from: w.tanks[1]!.pos });
    run(w, 1);
    expect(q.state).toBe("dropped");
    tankAt(w, 1, q.pos);
    run(w, 1);
    expect(q.state).toBe("home");
  });

  it("holding every enemy queen wins", () => {
    const w = make();
    for (const q of w.queens.filter((k) => k.team === 1)) Object.assign(q, { state: "held", heldBy: 0 });
    const events = run(w, 1);
    expect(w.mode).toMatchObject({ over: true, winner: 0 });
    expect(events.at(-1)).toEqual({ type: "matchOver", winner: 0 });
  });

  it("splits free-for-all slots across the fortresses", () => {
    const w = makeWorld(field, [0, 1, 2, 3].map((team) => ({ team, kind: "m1" as const })), { mode: { kind: "battlelord" } });
    expect(w.tanks.map((t) => t.team)).toEqual([0, 1, 0, 1]);
  });
});

describe("frenzy", () => {
  it("delivering the neutral queen scores and she reappears elsewhere", () => {
    const w = makeWorld(field, [{ team: 0, kind: "m1" }, { team: 1, kind: "m1" }], { mode: { kind: "frenzy" } });
    const q = w.queens[0]!;
    tankAt(w, 1, { x: 135, y: 25 });
    tankAt(w, 0, q.pos);
    run(w, 1);
    expect(q.state).toBe("carried");
    tankAt(w, 0, w.map.fortresses[0]!);
    run(w, 1);
    expect(w.mode.scores[0]).toBe(1);
    expect(q.state).toBe("home");
  });
});

describe("hold 'em", () => {
  it("the carrier's team scores per second and the carrier is slower", () => {
    const w = makeWorld(["S......", "......."], [{ team: 0, kind: "m1" }], { mode: { kind: "holdEm" } });
    const t = tankAt(w, 0, w.queens[0]!.pos);
    t.rot = 0;
    run(w, 31);
    expect(w.mode.scores[0]).toBeCloseTo(1, 0);
    run(w, 60, { [t.id]: { throttle: 1 } });
    expect(t.speed).toBeLessThanOrEqual(tankDefs.m1.speed * modeDefs.holdEm.carrySpeed + 0.01);
  });
});

describe("family mode", () => {
  it("softens damage and locks special switching", () => {
    const w = makeWorld(["S..S"], [{ team: 0, kind: "m1" }, { team: 1, kind: "m1" }], { mode: { kind: "family" } });
    const t = w.tanks[0]!;
    applyDamage(w, { target: t, amount: 50, sourceId: 0, from: { x: t.pos.x + Math.cos(t.rot) * 9, y: t.pos.y + Math.sin(t.rot) * 9 } });
    expect(t.hp).toBe(tankDefs.m1.hp - Math.round(50 * modeDefs.family.damageScale - tankDefs.m1.armor));
    t.specials = { mine: 1, guided: 1 };
    t.selected = "mine";
    run(w, 1, { [t.id]: { cycle: 1 } });
    expect(t.selected).toBe("mine");
  });
});
