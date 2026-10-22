import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";

const lane = ["........", "........", "S......S", "........", "........"];

describe("specials", () => {
  it("guided: one missile at a time, steered by the owner while the hull holds still", () => {
    const w = makeWorld(lane, [{ team: 0, kind: "m1" }]);
    const t = w.tanks[0]!;
    t.specials.guided = 2;
    t.selected = "guided";
    run(w, 1, { [t.id]: { special: true } });
    expect(w.missiles).toHaveLength(1);
    run(w, 30, { [t.id]: { special: true, throttle: 1, steer: 1 } });
    expect(w.missiles).toHaveLength(1);
    expect(t.specials.guided).toBe(1);
    expect(t.speed).toBe(0);
    expect(w.missiles[0]!.rot).not.toBeCloseTo(0);
  });

  it("super shot: stocked past the threshold, swarm empties the rack in one volley", () => {
    const w = makeWorld(lane, [{ team: 0, kind: "m1" }]);
    const t = w.tanks[0]!;
    t.specials.swarm = specialDefs.swarm.super.threshold;
    t.selected = "swarm";
    const events = run(w, 1, { [t.id]: { special: true } });
    expect(w.missiles).toHaveLength(specialDefs.swarm.super.perShot);
    expect(t.specials.swarm).toBeUndefined();
    expect(events).toContainEqual(expect.objectContaining({ type: "special", super: true }));
  });

  it("swarm rockets home on an enemy and hurt it", () => {
    const w = makeWorld([".......", "S.....S", "......."], [{ team: 0, kind: "m1" }, { team: 1, kind: "m1" }]);
    const [a, b] = [w.tanks[0]!, w.tanks[1]!];
    a.specials.swarm = 4;
    a.selected = "swarm";
    run(w, 1, { [a.id]: { special: true } });
    run(w, 60);
    expect(b.hp).toBeLessThan(tankDefs.m1.hp);
  });

  it("cycling skips empty slots and wraps", () => {
    const w = makeWorld(lane, [{ team: 0, kind: "m1" }]);
    const t = w.tanks[0]!;
    t.specials = { guided: 1, mine: 2 };
    t.selected = "guided";
    run(w, 1, { [t.id]: { cycle: 1 } });
    expect(t.selected).toBe("mine");
    run(w, 1, { [t.id]: { cycle: 1 } });
    expect(t.selected).toBe("guided");
  });

  it("using the last of a special selects the next one", () => {
    const w = makeWorld(lane, [{ team: 0, kind: "m1" }]);
    const t = w.tanks[0]!;
    t.specials = { health: 1, mine: 1 };
    t.selected = "health";
    t.hp = 10;
    run(w, 1, { [t.id]: { special: true } });
    expect(t.hp).toBe(10 + specialDefs.health.heal);
    expect(t.selected).toBe("mine");
  });
});

describe("mines", () => {
  it("arm, ignore teammates, then blow under an enemy", () => {
    const w = makeWorld(["S.S.S"], [{ team: 0, kind: "m1" }, { team: 0, kind: "m1" }, { team: 1, kind: "moto" }]);
    const [owner, mate, enemy] = [w.tanks[0]!, w.tanks[1]!, w.tanks[2]!];
    w.mines.push({ id: 999, ownerId: owner.id, team: 0, pos: { ...mate.pos }, armIn: 0 });
    run(w, 2);
    expect(w.mines).toHaveLength(1);
    enemy.pos = { ...mate.pos, x: mate.pos.x + 1 };
    mate.pos.x -= 8;
    const events = run(w, 1);
    expect(w.mines).toHaveLength(0);
    expect(events.some((e) => e.type === "mineTrigger")).toBe(true);
    expect(enemy.hp).toBeLessThan(tankDefs.moto.hp);
  });
});

describe("nuke", () => {
  it("detonates after the fuse, hurts everyone and flattens nearby buildings", () => {
    const w = makeWorld(["S.#........S"], [{ team: 0, kind: "goliath" }, { team: 1, kind: "goliath" }]);
    const [a, b] = [w.tanks[0]!, w.tanks[1]!];
    a.specials.nuke = 1;
    a.selected = "nuke";
    run(w, 1, { [a.id]: { special: true } });
    expect(w.nukes).toHaveLength(1);
    const events = run(w, Math.ceil(specialDefs.nuke.fuse * 30) + 1);
    expect(events.some((e) => e.type === "nukeDetonate")).toBe(true);
    expect(w.structures[0]!.stage).toBe(2);
    expect(b.hp).toBeLessThan(tankDefs.goliath.hp);
    expect(a.hp).toBeLessThan(b.hp);
  });
});
