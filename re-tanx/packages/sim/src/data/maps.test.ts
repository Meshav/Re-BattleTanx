import { describe, expect, it } from "vitest";
import { versusMaps } from "./maps.ts";
import { parseMap } from "./map.ts";
import { createWorld } from "../world.ts";
import { findPath } from "../ai/nav/grid.ts";
import { dist } from "../math/vec2.ts";

describe("versus maps", () => {
  for (const json of versusMaps) {
    it(`${json.id}: every spawn and fortress is reachable by a normal tank`, () => {
      const map = parseMap(json);
      expect(map.spawns.length).toBeGreaterThanOrEqual(4);
      expect(map.fortresses.length).toBeGreaterThanOrEqual(2);
      const w = createWorld(map, []);
      const points = [...map.spawns, ...map.fortresses];
      for (const p of points.slice(1)) {
        const path = findPath(w, points[0]!, p);
        expect(path, `${json.id} → (${p.x},${p.y})`).toBeDefined();
        if (path!.length) expect(dist(path!.at(-1)!, p)).toBeLessThan(15);
      }
    });
  }
});
