import { describe, expect, it } from "vitest";
import { checkMap } from "@re-tanx/sim";
import { decodeMapCode, encodeMapCode } from "./mapCode.ts";

const good = ["#############", "#S....#....S#", "#..H..w..~..#", "#.....#.....#", "#..##...##..#", "#..........R#", "#S.........S#", "#############"];

describe("map share codes", () => {
  it("share codes round-trip and reject garbage", () => {
    const m = checkMap({ name: "Ünïcode yard", rows: good }).map!;
    expect(decodeMapCode(encodeMapCode(m)).map).toEqual(m);
    expect(decodeMapCode("!!!").problems).toEqual(["That isn't a map code"]);
  });
});
