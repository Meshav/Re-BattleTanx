import { describe, expect, it } from "vitest";
import { makeWorld } from "../../testing/makeWorld.ts";
import { findPath } from "./grid.ts";

const maze = [
  "S.#....",
  "..#.##.",
  "..#..#.",
  "....#..",
];

describe("grid A*", () => {
  it("routes around buildings without cutting corners", () => {
    const w = makeWorld(maze, []);
    const path = findPath(w, { x: 5, y: 5 }, { x: 35, y: 5 })!;
    expect(path.at(-1)).toEqual({ x: 35, y: 5 });
    expect(path.length).toBeGreaterThan(4);
    for (const p of path) expect(maze[Math.floor(p.y / 10)]![Math.floor(p.x / 10)]).not.toBe("#");
  });

  it("returns undefined when the goal is walled in, and finds the shortcut once a wall is rubble", () => {
    const w = makeWorld(["S.#.", "####", "####"], []);
    expect(findPath(w, { x: 5, y: 5 }, { x: 35, y: 5 })).toBeUndefined();
    w.structures[0]!.stage = 2;
    expect(findPath(w, { x: 5, y: 5 }, { x: 35, y: 5 })).toHaveLength(3);
  });

  it("routes around water, except for hovers", () => {
    const w = makeWorld(["S.~..", "..~..", "....."], []);
    const walk = findPath(w, { x: 5, y: 5 }, { x: 45, y: 5 })!;
    expect(walk.some((p) => p.y > 20)).toBe(true);
    const glide = findPath(w, { x: 5, y: 5 }, { x: 45, y: 5 }, true)!;
    expect(glide.every((p) => p.y < 10)).toBe(true);
  });

  it("aims for the nearest open cell when the goal is inside a building", () => {
    const w = makeWorld(["S...", "..#.", "...."], []);
    const path = findPath(w, { x: 5, y: 5 }, { x: 25, y: 15 })!;
    expect(path.length).toBeGreaterThan(0);
  });
});
