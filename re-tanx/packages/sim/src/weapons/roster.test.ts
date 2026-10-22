import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { applyDamage } from "../systems/applyDamage.ts";
import { dist } from "../math/vec2.ts";

const open = ["...........", "S.........S", "...........", "..........."];
const pair = (a: keyof typeof tankDefs, b: keyof typeof tankDefs, rows = open) => {
  const w = makeWorld(rows, [{ team: 0, kind: a }, { team: 1, kind: b }]);
  const [x, y] = [w.tanks[0]!, w.tanks[1]!];
  x.rot = x.turretRot = 0;
  y.rot = Math.PI;
  return { w, x, y };
};

describe("tank roster", () => {
  it("hover strafes sideways and takes extra damage", () => {
    const { w, x } = pair("hover", "m1");
    run(w, 30, { [x.id]: { strafe: 1 } });
    expect(x.pos.y).toBeGreaterThan(18);
    const hp = x.hp;
    applyDamage(w, { target: x, amount: 20, sourceId: 0, from: { x: x.pos.x + 10, y: x.pos.y } });
    expect(hp - x.hp).toBe(Math.round(20 * tankDefs.hover.damageTaken! - tankDefs.hover.armor));
  });

  it("inferno sets targets burning; the burn keeps hurting after the flame stops", () => {
    const { w, x, y } = pair("inferno", "m1");
    y.pos = { x: x.pos.x + 9, y: x.pos.y };
    run(w, 3, { [x.id]: { fire: true } });
    expect(y.fx.burn).toBeGreaterThan(0);
    const hp = y.hp;
    run(w, 30, { [x.id]: { fire: false } });
    expect(y.hp).toBeLessThan(hp);
  });

  it("FLP-E laser overheats and locks out", () => {
    const { w, x } = pair("flpe", "goliath");
    run(w, 30 * 6, { [x.id]: { fire: true } });
    expect(x.overheated).toBeGreaterThan(0);
  });

  it("sentinel mortar flies over buildings and outranges once dug in", () => {
    const { w, x, y } = pair("sentinel", "m1", ["...........", "S...#.....S", "...........", "..........."]);
    y.pos = { x: 60, y: 15 };
    run(w, 40);
    run(w, 60, { [x.id]: { fire: true } });
    expect(y.hp).toBeLessThan(tankDefs.m1.hp);
  });

  it("rattler rockets curve onto a target off the turret line", () => {
    const { w, x, y } = pair("rattler", "m1");
    y.pos = { x: 70, y: 25 };
    x.turretRot = 0.15;
    run(w, 60, { [x.id]: { fire: true, aim: 0.15 } });
    expect(y.hp).toBeLessThan(tankDefs.m1.hp);
  });

  it("rhino's plow hits harder than a goliath ram", () => {
    const hit = (kind: "rhino" | "goliath") => {
      const { w, x, y } = pair(kind, "goliath");
      x.speed = tankDefs[kind].speed;
      y.pos.x = x.pos.x + tankDefs[kind].radius + 3.2;
      y.speed = 7;
      run(w, 2, { [x.id]: { throttle: 1 }, [y.id]: { throttle: 1 } });
      return tankDefs.goliath.hp - y.hp;
    };
    expect(hit("rhino")).toBeGreaterThan(hit("goliath"));
  });
});

describe("new specials", () => {
  const armed = (kind: string, amount = 1) => {
    const { w, x, y } = pair("m1", "m1");
    x.specials = { [kind]: amount };
    x.selected = kind as never;
    return { w, x, y };
  };

  it("super laser pierces every enemy on the line", () => {
    const w = makeWorld(open, [{ team: 0, kind: "m1" }, { team: 1, kind: "m1" }, { team: 1, kind: "m1" }]);
    const [x, a, b] = [w.tanks[0]!, w.tanks[1]!, w.tanks[2]!];
    x.rot = x.turretRot = 0;
    a.pos = { x: 40, y: 15 };
    b.pos = { x: 70, y: 15 };
    x.specials = { laser: 4 };
    x.selected = "laser";
    run(w, 1, { [x.id]: { special: true } });
    expect(a.hp).toBeLessThan(tankDefs.m1.hp);
    expect(b.hp).toBeLessThan(tankDefs.m1.hp);
  });

  it("sentry turret shoots enemies and can be destroyed", () => {
    const { w, x, y } = armed("turret");
    y.pos = { x: 30, y: 15 };
    run(w, 1, { [x.id]: { special: true } });
    expect(w.turrets).toHaveLength(1);
    run(w, 30);
    expect(y.hp).toBeLessThan(tankDefs.m1.hp);
    w.turrets[0]!.hp = 1;
    w.projectiles.push({ id: 999, ownerId: y.id, pos: { ...w.turrets[0]!.pos }, vel: { x: 0, y: 0 }, damage: 5, splash: 0, ttl: 1 });
    run(w, 2);
    expect(w.turrets).toHaveLength(0);
  });

  it("edge burst shoves and stuns nearby enemies", () => {
    const { w, x, y } = armed("edge");
    y.pos = { x: x.pos.x + 8, y: x.pos.y };
    const before = dist(x.pos, y.pos);
    run(w, 1, { [x.id]: { special: true } });
    expect(dist(x.pos, y.pos)).toBeGreaterThan(before + 3);
    const pos = { ...y.pos };
    run(w, 20, { [y.id]: { throttle: 1 } });
    expect(dist(pos, y.pos)).toBeLessThan(0.5);
  });

  it("cloak hides a tank from bots until it fires", () => {
    const w = makeWorld(open, [{ team: 0, kind: "m1", bot: "hard" }, { team: 1, kind: "m1" }]);
    const [bot, ghost] = [w.tanks[0]!, w.tanks[1]!];
    ghost.specials = { cloak: 1 };
    ghost.selected = "cloak";
    run(w, 1, { [ghost.id]: { special: true } });
    run(w, 20);
    expect(w.bots[bot.id]!.memory[ghost.id]).toBeUndefined();
    run(w, 2, { [ghost.id]: { fire: true } });
    expect(ghost.fx.cloak).toBe(0);
  });

  it("speed boost, repair and teleport", () => {
    const { w, x } = armed("speed");
    run(w, 1, { [x.id]: { special: true } });
    run(w, 60, { [x.id]: { throttle: 1 } });
    expect(x.speed).toBeGreaterThan(tankDefs.m1.speed * 1.2);
    x.specials = { repair: 1, teleport: 1 };
    x.selected = "repair";
    x.hp = 20;
    run(w, 1, { [x.id]: { special: true } });
    run(w, 60);
    expect(x.hp).toBeGreaterThan(30);
    const w2 = makeWorld(["S.....#"], [{ team: 0, kind: "m1" }]);
    const t = w2.tanks[0]!;
    t.rot = 0;
    t.specials = { teleport: 1 };
    t.selected = "teleport";
    run(w2, 1, { [t.id]: { special: true } });
    expect(t.pos.x).toBeGreaterThan(20);
    expect(t.pos.x).toBeLessThan(60 - tankDefs.m1.radius + 0.01);
  });
});
