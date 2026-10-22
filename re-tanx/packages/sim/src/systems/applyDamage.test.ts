import { describe, expect, it } from "vitest";
import { makeWorld } from "../testing/makeWorld.ts";
import { applyDamage, damageStructure } from "./applyDamage.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { rules } from "../data/rules.ts";

const rows = ["S.S#"];

describe("applyDamage", () => {
  it("subtracts armor and never deals less than 1", () => {
    const w = makeWorld(rows, [{ team: 0, kind: "goliath" }, { team: 1, kind: "m1" }]);
    const [a, b] = w.tanks as [NonNullable<(typeof w.tanks)[0]>, NonNullable<(typeof w.tanks)[0]>];
    const front = { x: a.pos.x + 10, y: a.pos.y };
    applyDamage(w, { target: a, amount: 20, sourceId: b.id, from: front });
    expect(a.hp).toBe(tankDefs.goliath.hp - (20 - tankDefs.goliath.armor));
    applyDamage(w, { target: a, amount: 1, sourceId: b.id, from: front });
    expect(a.hp).toBe(tankDefs.goliath.hp - (20 - tankDefs.goliath.armor) - 1);
  });

  it("rear hits take the rear multiplier", () => {
    const w = makeWorld(rows, [{ team: 0, kind: "m1" }]);
    const t = w.tanks[0]!;
    applyDamage(w, { target: t, amount: 30, sourceId: 99, from: { x: t.pos.x - 10, y: t.pos.y } });
    expect(t.hp).toBe(tankDefs.m1.hp - Math.round(30 * rules.directional.rear - tankDefs.m1.armor));
  });

  it("kills credit the enemy and schedule a respawn", () => {
    const w = makeWorld(rows, [{ team: 0, kind: "moto" }, { team: 1, kind: "m1" }]);
    const [victim, killer] = [w.tanks[0]!, w.tanks[1]!];
    const events = applyDamage(w, { target: victim, amount: 999, sourceId: killer.id, from: victim.pos });
    expect(victim.alive).toBe(false);
    expect(victim.respawnIn).toBe(rules.respawnDelay);
    expect(killer.kills).toBe(1);
    expect(events.some((e) => e.type === "kill")).toBe(true);
  });
});

describe("damageStructure", () => {
  it("steps intact → damaged → rubble and emits each change once", () => {
    const w = makeWorld(rows, []);
    const s = w.structures[0]!;
    expect(damageStructure(s, s.maxHp * 0.6)).toEqual([{ type: "structureStage", structureId: s.id, stage: 1 }]);
    expect(damageStructure(s, 1)).toEqual([]);
    expect(damageStructure(s, s.maxHp)[0]).toMatchObject({ stage: 2 });
    expect(damageStructure(s, 10)).toEqual([]);
  });
});
