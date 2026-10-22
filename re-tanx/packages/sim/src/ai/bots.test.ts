import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { dist } from "../math/vec2.ts";

const arena = [
  "..............",
  ".S..........S.",
  "..............",
  "....##..##....",
  "..............",
  ".S..........S.",
  "..............",
];

describe("bots", () => {
  it("a wingman survives its leader dying mid-think", () => {
    const w = makeWorld(arena, [{ team: 0, kind: "m1" }, { team: 0, kind: "m1", bot: "normal" }]);
    w.bots[w.tanks[1]!.id]!.leaderId = w.tanks[0]!.id;
    run(w, 10);
    w.tanks[0]!.alive = false; // dies between brain ticks
    expect(() => run(w, 5)).not.toThrow();
  });

  it("find and damage an idle enemy", () => {
    const w = makeWorld(arena, [{ team: 0, kind: "m1", bot: "hard" }, { team: 1, kind: "m1" }]);
    run(w, 30 * 20);
    expect(w.tanks[1]!.hp < tankDefs.m1.hp || w.tanks[1]!.deaths > 0).toBe(true);
  });

  it("respect attack tokens: easy bots never exceed two shooters on one target", () => {
    const w = makeWorld(arena, [
      { team: 1, kind: "goliath" },
      { team: 0, kind: "m1", bot: "easy" }, { team: 0, kind: "m1", bot: "easy" }, { team: 0, kind: "m1", bot: "easy" },
    ]);
    const target = w.tanks[0]!;
    let maxShooters = 0;
    for (let i = 0; i < 30 * 15; i++) {
      run(w, 1);
      const shooters = Object.values(w.bots).filter((b) => b.firingAt === target.id).length;
      maxShooters = Math.max(maxShooters, shooters);
    }
    expect(maxShooters).toBeLessThanOrEqual(2);
    expect(maxShooters).toBeGreaterThan(0);
  });

  it("retreat when badly hurt and an enemy is known", () => {
    const w = makeWorld(arena, [{ team: 0, kind: "m1", bot: "normal" }, { team: 1, kind: "goliath" }]);
    const [bot, enemy] = [w.tanks[0]!, w.tanks[1]!];
    w.pickups = [];
    bot.hp = 10;
    enemy.pos = { x: bot.pos.x + 15, y: bot.pos.y };
    run(w, 10);
    expect(w.bots[bot.id]!.behavior).toBe("retreat");
    const before = dist(bot.pos, enemy.pos);
    run(w, 60);
    expect(dist(bot.pos, enemy.pos)).toBeGreaterThan(before);
  });

  it("go for a health crate when hurt and nothing is around", () => {
    const w = makeWorld(["S..H"], [{ team: 0, kind: "m1", bot: "normal" }]);
    const bot = w.tanks[0]!;
    bot.hp = 30;
    run(w, 30 * 6);
    expect(bot.hp).toBeGreaterThan(30);
  });

  it("flee a ticking nuke", () => {
    const w = makeWorld(arena, [{ team: 0, kind: "m1", bot: "normal" }]);
    const bot = w.tanks[0]!;
    w.nukes.push({ id: 999, ownerId: 0, pos: { ...bot.pos }, fuse: 5 });
    run(w, 30 * 4.5);
    expect(dist(bot.pos, { x: 15, y: 15 })).toBeGreaterThan(30);
  });
});
