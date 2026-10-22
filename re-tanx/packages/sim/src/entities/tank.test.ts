import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { gangDefs } from "../data/gangDefs.ts";
import { applyDamage } from "../systems/applyDamage.ts";
import { rules } from "../data/rules.ts";

const kill = (w: ReturnType<typeof makeWorld>, i: number) => {
  const t = w.tanks[i]!;
  applyDamage(w, { target: t, amount: 9999, sourceId: 0, from: t.pos });
  w.pickups = []; // no enemies → it respawns on its own dropped loot
  run(w, rules.respawnDelay * 30 + 2);
};

describe("gangs", () => {
  it("cycle through all five roster tanks before repeating", () => {
    const w = makeWorld(["S...S"], [{ team: 0, gang: "rustSaints" }]);
    const seen = [w.tanks[0]!.kind];
    for (let i = 0; i < 4; i++) {
      kill(w, 0);
      seen.push(w.tanks[0]!.kind);
    }
    expect([...seen].sort()).toEqual([...gangDefs.rustSaints.roster].sort());
  });

  it("spawn with the gang signature item", () => {
    const w = makeWorld(["S...S"], [{ team: 0, gang: "madBattalion" }]);
    expect(w.tanks[0]!.specials.swarm).toBeGreaterThan(0);
    expect(w.tanks[0]!.selected).toBe("swarm");
  });

  it("a once-per-match signature (nuke) is not handed out again", () => {
    const w = makeWorld(["S...S"], [{ team: 0, gang: "atomicPaladins" }]);
    expect(w.tanks[0]!.specials.nuke).toBe(1);
    kill(w, 0);
    expect(w.tanks[0]!.specials.nuke).toBeUndefined();
  });

  it("the same seed gives the same roster order", () => {
    const a = makeWorld(["S"], [{ team: 0, gang: "ironHounds" }]);
    const b = makeWorld(["S"], [{ team: 0, gang: "ironHounds" }]);
    expect(a.tanks[0]!.roster).toEqual(b.tanks[0]!.roster);
  });
});
