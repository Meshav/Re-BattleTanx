import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { levelFor, perkSlots, unlocksUpTo, xpToNext, masteryLevel, isUnlocked } from "./levels.ts";
import { matchXp } from "./xp.ts";
import { advanceChallenges, dailyChallenges } from "./challenges.ts";
import { perkMods } from "./perks.ts";
import { tankDefs } from "../data/tankDefs.ts";
import { applyDamage } from "../systems/applyDamage.ts";

describe("levels", () => {
  it("follows 500 + 150×L and caps at 50", () => {
    expect(levelFor(0)).toEqual({ level: 1, into: 0, next: xpToNext(1) });
    expect(levelFor(xpToNext(1)).level).toBe(2);
    expect(levelFor(1e9).level).toBe(50);
  });

  it("unlocks gangs, tanks and perk slots along the track", () => {
    expect(isUnlocked(1, "gang:ironHounds")).toBe(true);
    expect(isUnlocked(1, "gang:blackHalos")).toBe(false);
    expect(perkSlots(2)).toBe(0);
    expect(perkSlots(20)).toBe(3);
    expect(unlocksUpTo(50)).toContain("gang:edgeborn");
  });

  it("mastery climbs with kills in that tank, 1 to 10", () => {
    expect(masteryLevel(0)).toBe(1);
    expect(masteryLevel(225)).toBe(10);
  });
});

describe("match XP", () => {
  it("pays kills, completion and victory; bot-only matches pay half", () => {
    const w = makeWorld(["S...S"], [{ team: 0, kind: "goliath" }, { team: 1, kind: "moto", bot: "easy" }], { mode: { kind: "deathmatch", scoreLimit: 1 } });
    const [me, bot] = [w.tanks[0]!, w.tanks[1]!];
    bot.hp = 1;
    run(w, 40, { [me.id]: { fire: true } });
    expect(w.mode.winner).toBe(0);
    const full = matchXp(w, me.id, { botsOnly: false, firstWinToday: false });
    expect(full.total).toBe(50 + 150 + 100);
    expect(matchXp(w, me.id, { botsOnly: true, firstWinToday: false }).total).toBe(150);
    expect(matchXp(w, me.id, { botsOnly: false, firstWinToday: true }).total).toBe(800);
  });
});

describe("challenges", () => {
  it("everyone gets the same three per day, and they pay once", () => {
    const ids = dailyChallenges("2026-10-21");
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    expect(dailyChallenges("2026-10-21")).toEqual(ids);
    let r = advanceChallenges(undefined, "2026-10-21", { kills: 99, structures: 99, matches: 99, wins: 99, queens: 99, specials: 99, pickups: 99, missions: 99 });
    expect(r.completed).toHaveLength(3);
    r = advanceChallenges(r.state, "2026-10-21", { kills: 99 });
    expect(r.completed).toHaveLength(0);
    expect(advanceChallenges(r.state, "2026-10-22", {}).state.claimed).toEqual([]);
  });
});

describe("perks", () => {
  it("are sidegrades: an upside and a downside", () => {
    expect(perkMods({ perks: ["demolitionist"] })).toMatchObject({ structureDmg: 1.5, tankDmg: 0.9 });
    expect(perkMods({ perks: [] }).maxHp).toBe(1);
  });

  it("change real numbers in play: Scavenger max HP, Demolitionist structure damage", () => {
    const w = makeWorld(["S.#.S"], [{ team: 0, kind: "m1", perks: ["scavenger", "demolitionist"] }, { team: 1, kind: "m1" }]);
    expect(w.tanks[0]!.hp).toBe(Math.round(tankDefs.m1.hp * 0.9));
    run(w, 25, { [w.tanks[0]!.id]: { fire: true } });
    expect(w.structures[0]!.maxHp - w.structures[0]!.hp).toBe(tankDefs.m1.gun.damage * 1.5);
  });

  it("are stripped when the lobby turns perks off", () => {
    const w = makeWorld(["S.S"], [{ team: 0, kind: "m1", perks: ["scavenger"] }], { perks: false });
    expect(w.tanks[0]!.perks).toEqual([]);
    expect(w.tanks[0]!.hp).toBe(tankDefs.m1.hp);
  });

  it("Last Stand hits harder when nearly dead", () => {
    const hit = (hp: number) => {
      const w = makeWorld(["S...S"], [{ team: 0, kind: "m1", perks: ["lastStand"] }, { team: 1, kind: "goliath" }]);
      const [a, b] = [w.tanks[0]!, w.tanks[1]!];
      a.hp = hp;
      applyDamage(w, { target: b, amount: 40, sourceId: a.id, from: { x: b.pos.x - Math.cos(b.rot) * -10, y: b.pos.y } });
      return tankDefs.goliath.hp - b.hp;
    };
    expect(hit(10)).toBeGreaterThan(hit(80));
  });
});

describe("match stats", () => {
  it("credit kills, structure collapses and specials to the right tank", () => {
    const w = makeWorld(["S.#.S"], [{ team: 0, kind: "goliath" }, { team: 1, kind: "moto" }]);
    const a = w.tanks[0]!;
    w.structures[0]!.hp = 1;
    run(w, 20, { [a.id]: { fire: true } });
    expect(w.stats[a.id]!.structures).toBe(1);
  });
});

import { applyMatch, legalPerks, newProfile, sanitizeProfile } from "./profile.ts";

describe("profile", () => {
  it("a won match adds XP, totals, mastery, first-win bonus once per day, and reports unlocks", () => {
    const w = makeWorld(["S...S"], [{ team: 0, kind: "goliath" }, { team: 1, kind: "moto" }], { mode: { kind: "deathmatch", scoreLimit: 1 } });
    w.tanks[1]!.hp = 1;
    run(w, 40, { [w.tanks[0]!.id]: { fire: true } });
    const r1 = applyMatch(newProfile(), w, w.tanks[0]!.id, { botsOnly: false, day: "2026-10-21" });
    expect(r1.profile.totals).toMatchObject({ matches: 1, wins: 1, kills: 1 });
    expect(r1.profile.masteryKills.goliath).toBe(1);
    expect(r1.award.lines.some((l) => l.label === "First win today")).toBe(true);
    const r2 = applyMatch(r1.profile, w, w.tanks[0]!.id, { botsOnly: false, day: "2026-10-21" });
    expect(r2.award.lines.some((l) => l.label === "First win today")).toBe(false);
    expect(r1.levelAfter).toBeGreaterThanOrEqual(r1.levelBefore);
  });

  it("only lets you equip as many perks as your level allows", () => {
    expect(legalPerks({ xp: 0 }, ["scavenger"])).toEqual([]);
    expect(legalPerks({ xp: 1e9 }, ["scavenger", "nope", "scavenger", "treads", "lastStand", "fieldMedic"])).toEqual(["scavenger", "treads", "lastStand"]);
  });

  it("sanitizes junk instead of trusting it", () => {
    expect(sanitizeProfile({ xp: -5, perks: ["x"], totals: null }).xp).toBe(0);
    expect(sanitizeProfile("nope")).toEqual(newProfile());
  });
});
