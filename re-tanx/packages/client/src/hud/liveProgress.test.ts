import { expect, it } from "vitest";
import { createWorld, newProfile, parseMap, xpToNext } from "@re-tanx/sim";
import { newTally, tallyEvents } from "./liveProgress.ts";

it("pays XP per enemy kill and reports level, tank rank and weapon level-ups", () => {
  const world = createWorld(parseMap({ id: "t", name: "t", cell: 10, rows: ["S..S"] }), [{ team: 0, kind: "m1" }, { team: 1, kind: "moto" }]);
  const [me, foe] = [world.tanks[0]!, world.tanks[1]!];
  const t = newTally({ ...newProfile(), xp: xpToNext(1) - 10, masteryKills: { m1: 4 }, weaponXp: { guided: 7, mine: 5 } }, me.id, world);
  expect(t.perKill).toBe(50); // two humans: full rate

  const r = tallyEvents(t, [{ type: "kill", victimId: foe.id, killerId: me.id }, { type: "special", tankId: me.id, kind: "guided", super: false, pos: me.pos }], world);
  expect(r.xp).toBe(50);
  expect(r.ups.map((u) => [u.kind, u.badge])).toEqual([["acct", "2"], ["tank", "2"], ["weapon", "V2"]]);

  // a kill with a special pays that weapon's kill XP (5 + 3 crosses V2)
  expect(tallyEvents(t, [{ type: "kill", victimId: foe.id, killerId: me.id, weapon: "mine" }], world).ups.map((u) => u.badge)).toContain("V2");

  // self-destructs and other tanks' kills don't count
  expect(tallyEvents(t, [{ type: "kill", victimId: me.id, killerId: me.id }, { type: "kill", victimId: me.id, killerId: foe.id }], world)).toEqual({ xp: 0, ups: [] });
});
