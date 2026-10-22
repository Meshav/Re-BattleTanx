import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { pickupDefs } from "../data/pickupDefs.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { applyDamage } from "./applyDamage.ts";

describe("pickups", () => {
  it("health heals, then respawns after its timer", () => {
    const w = makeWorld(["S.H"], [{ team: 0, kind: "m1" }]);
    const t = w.tanks[0]!;
    t.hp = 20;
    t.pos = { ...w.pickups[0]!.pos };
    run(w, 1);
    expect(t.hp).toBe(20 + pickupDefs.health.heal);
    expect(w.pickups[0]!.active).toBe(false);
    t.pos.x -= 6;
    run(w, pickupDefs.health.respawn * 30 + 1);
    expect(w.pickups[0]!.active).toBe(true);
  });

  it("health at full HP is stored as a usable item", () => {
    const w = makeWorld(["SH"], [{ team: 0, kind: "m1" }]);
    const t = w.tanks[0]!;
    t.pos = { ...w.pickups[0]!.pos };
    run(w, 1);
    expect(t.specials.health).toBe(1);
  });

  it("a special pickup is left alone when the tank is already full of it", () => {
    const w = makeWorld(["SG"], [{ team: 0, kind: "m1" }]);
    const t = w.tanks[0]!;
    t.specials.guided = 3;
    t.pos = { ...w.pickups[0]!.pos };
    run(w, 1);
    expect(w.pickups[0]!.active).toBe(true);
  });

  it("shield soaks damage before HP", () => {
    const w = makeWorld(["SD"], [{ team: 0, kind: "m1" }]);
    const t = w.tanks[0]!;
    t.pos = { ...w.pickups[0]!.pos };
    run(w, 1);
    expect(t.shield).toBe(pickupDefs.shield.absorb);
    const front = { x: t.pos.x + Math.cos(t.rot) * 10, y: t.pos.y + Math.sin(t.rot) * 10 };
    applyDamage(w, { target: t, amount: 50 + tankDefs.m1.armor, sourceId: 0, from: front });
    expect(t.hp).toBe(tankDefs.m1.hp);
    expect(t.shield).toBe(pickupDefs.shield.absorb - 50);
  });

  it("death drops a star and the victim's special stack", () => {
    const w = makeWorld(["S...S"], [{ team: 0, kind: "m1" }, { team: 1, kind: "m1" }]);
    const [a, b] = [w.tanks[0]!, w.tanks[1]!];
    a.specials.mine = 4;
    a.selected = "mine";
    applyDamage(w, { target: a, amount: 999, sourceId: b.id, from: b.pos });
    const kinds = w.pickups.map((p) => p.kind);
    expect(kinds).toEqual(["star", "loot"]);
    expect(w.pickups[1]).toMatchObject({ special: "mine", amount: 4 });
    b.pos = { ...w.pickups[1]!.pos };
    run(w, 1);
    expect(b.specials.mine).toBe(4);
  });
});
