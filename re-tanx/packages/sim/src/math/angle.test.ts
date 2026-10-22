import { describe, expect, it } from "vitest";
import { turnToward, wrapAngle } from "./angle.ts";

describe("angles", () => {
  it("wraps into (-PI, PI]", () => {
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-Math.PI / 2 - 2 * Math.PI)).toBeCloseTo(-Math.PI / 2);
  });
  it("turns the short way and stops on target", () => {
    expect(turnToward(3, -3, 0.1)).toBeCloseTo(3.1);
    expect(turnToward(0, 0.05, 0.1)).toBeCloseTo(0.05);
  });
});
