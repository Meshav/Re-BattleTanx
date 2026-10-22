import { describe, expect, it } from "vitest";
import { newRating, rate, rateMatch } from "./glicko.ts";

describe("glicko-2", () => {
  it("matches the worked example in Glickman's paper", () => {
    const p = rate({ r: 1500, rd: 200, vol: 0.06, games: 0 }, [
      { opp: { r: 1400, rd: 30, vol: 0.06, games: 0 }, score: 1 },
      { opp: { r: 1550, rd: 100, vol: 0.06, games: 0 }, score: 0 },
      { opp: { r: 1700, rd: 300, vol: 0.06, games: 0 }, score: 0 },
    ]);
    expect(p.r).toBeCloseTo(1464.06, 1);
    expect(p.rd).toBeCloseTo(151.52, 1);
    expect(p.vol).toBeCloseTo(0.05999, 4);
  });

  it("FFA placement: winner gains, last loses, ratings stay finite", () => {
    const [a, b, c] = rateMatch([{ rating: newRating(), place: 0 }, { rating: newRating(), place: 1 }, { rating: newRating(), place: 2 }]);
    expect(a!.r).toBeGreaterThan(1500);
    expect(c!.r).toBeLessThan(1500);
    expect(Math.abs(b!.r - 1500)).toBeLessThan(1);
    for (const x of [a!, b!, c!]) expect(Number.isFinite(x.r) && x.rd < 350).toBe(true);
  });
});
