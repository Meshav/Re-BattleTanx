import { describe, expect, it } from "vitest";
import { checkMap } from "./mapCheck.ts";
import { versusMaps } from "./maps.ts";

const good = ["#############", "#S....#....S#", "#..H..w..~..#", "#.....#.....#", "#..##...##..#", "#..........R#", "#S.........S#", "#############"];

describe("custom maps", () => {
  it("accepts a sound map and gives it a stable content id", () => {
    const a = checkMap({ name: "My <b>yard</b>", rows: good });
    const b = checkMap({ name: "other", rows: good });
    expect(a.problems).toEqual([]);
    expect(a.map!.id).toBe(b.map!.id);
    expect(a.map!.name).toBe("My byardb");
  });

  it("every built-in arena would pass the editor's checks", () => {
    for (const m of versusMaps) expect(checkMap(m).problems, m.id).toEqual([]);
  });

  it("rejects junk: size, ragged rows, unknown tiles, too few or cut-off spawns", () => {
    expect(checkMap({ rows: ["S"] }).problems[0]).toMatch(/Size/);
    expect(checkMap({ rows: good.map((r, i) => (i === 2 ? r + "." : r)) }).problems).toEqual(["Every row must be the same width"]);
    expect(checkMap({ rows: good.map((r, i) => (i === 2 ? r.replace("H", "X") : r)) }).problems).toEqual(["Unknown tile"]);
    expect(checkMap({ rows: good.map((r) => r.replace(/S/g, ".")) }).problems).toContain("Needs at least 2 spawn points (S)");
    const boxed = [...good];
    boxed[5] = "#..........##";
    boxed[6] = "#S.........#S";
    boxed[7] = "############~";
    expect(checkMap({ rows: boxed }).problems.join()).toMatch(/cut off|Unknown/);
    expect(checkMap(null).problems.length).toBeGreaterThan(0);
  });

});
