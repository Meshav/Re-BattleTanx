import { describe, expect, it } from "vitest";
import { makeWorld, run } from "../testing/makeWorld.ts";
import { perkMods, perkLevel, isPro } from "./perks.ts";
import { loadoutOf } from "./loadout.ts";
import { applyMatch, newProfile } from "./profile.ts";
import { weaponPower, xpToNext } from "./levels.ts";
import { specialDefs } from "../data/specialDefs.ts";
import { useHealthKit } from "../weapons/healthKit.ts";
import { createMissionWorld } from "../campaign/createMission.ts";
import { campaignMissions } from "../data/missions.ts";

describe("loadout effects", () => {
  it("upgraded utility specials give more of what they do", () => {
    const w = makeWorld(["S...S"], [{ team: 0, kind: "goliath", weaponXp: { health: 1e6 } }, { team: 1, kind: "goliath" }]);
    const [mine, stock] = [w.tanks[0]!, w.tanks[1]!];
    mine.hp = stock.hp = 10;
    useHealthKit(w, mine);
    useHealthKit(w, stock);
    expect(stock.hp).toBe(10 + specialDefs.health.heal);
    expect(mine.hp).toBeCloseTo(10 + specialDefs.health.heal * weaponPower(5));
  });

  it("tank rank upgrades apply to the tank you're driving, and land mid-match", () => {
    expect(perkMods({ perks: [], kind: "m1", mastery: { m1: 1e6 } })).toMatchObject({ maxHp: 1.05, speed: 1.04, fireRate: 1.06, damageTaken: 0.94 });
    expect(perkMods({ perks: [], kind: "moto", mastery: { m1: 1e6 } }).maxHp).toBe(1);
    const w = makeWorld(["S...S"], [{ team: 0, kind: "m1", mastery: { m1: 14 } }, { team: 1, kind: "moto" }], { mode: { kind: "deathmatch", scoreLimit: 9 } });
    w.tanks[1]!.hp = 1;
    run(w, 40, { [w.tanks[0]!.id]: { fire: true } });
    expect(w.tanks[0]!.mastery!.m1).toBe(15); // rank 3: Reinforced plating
    expect(perkMods(w.tanks[0]).maxHp).toBe(1.05);
  });

  it("PRO adds its bonus; perk levels I–III lead to it", () => {
    expect(perkMods({ perks: ["scavenger"], pros: ["scavenger"] }).healthPickup).toBeCloseTo(1.2);
    expect(perkMods({ perks: ["scavenger"] }).healthPickup).toBe(1);
    expect(perkLevel("scavenger", 0).level).toBe(1);
    expect(perkLevel("scavenger", 40).level).toBe(4);
    expect(isPro({ perkProgress: { scavenger: 40 } }, "scavenger")).toBe(true);
  });

  it("an Oracle's passive grows with bond; her gift arrives at bond 3", () => {
    expect(perkMods({ perks: [], oracle: { id: "vesper", bond: 5 } }).maxHp).toBeCloseTo(1.12);
    expect(perkMods({ perks: [], oracle: { id: "vesper", bond: 1 } }).maxHp).toBeCloseTo(1.024);
    const w = makeWorld(["S...S"], [{ team: 0, kind: "m1", oracle: { id: "vesper", bond: 3 } }, { team: 0, kind: "m1", oracle: { id: "vesper", bond: 2 } }]);
    expect(w.tanks[0]!.specials.health).toBe(1);
    expect(w.tanks[1]!.specials.health).toBeUndefined();
  });

  it("Arcade strips the whole loadout", () => {
    const w = makeWorld(["S...S"], [{ team: 0, kind: "m1", perks: ["treads"], pros: ["treads"], weaponXp: { laser: 9 }, mastery: { m1: 99 }, oracle: { id: "vesper", bond: 5 } }], { perks: false });
    const t = w.tanks[0]!;
    expect([t.perks, t.pros, t.weaponXp, t.mastery, t.oracle, t.specials.health]).toEqual([[], undefined, undefined, undefined, undefined, undefined]);
  });
});

describe("loadout progression", () => {
  it("loadoutOf only brings what the profile has unlocked", () => {
    const fresh = { ...newProfile(), perks: ["scavenger" as const], oracle: "vesper" as const };
    expect(loadoutOf(fresh)).toMatchObject({ perks: [], pros: [] });
    expect(loadoutOf(fresh).oracle).toBeUndefined();
    const vet = { ...newProfile(), xp: 1e9, perkProgress: { scavenger: 40 }, bonds: { vesper: 90 }, totals: { ...newProfile().totals, missions: 1 } };
    expect(loadoutOf(vet, ["scavenger", "treads"], "vesper")).toMatchObject({ perks: ["scavenger", "treads"], pros: ["scavenger"], oracle: { id: "vesper", bond: 3 } });
  });

  it("a match advances PRO and bond, and reports PRO, bond, Oracle and tank-upgrade unlocks", () => {
    const w = makeWorld(["S...S"], [{ team: 0, kind: "m1", perks: ["treads"], oracle: { id: "vesper", bond: 1 } }, { team: 1, kind: "moto" }], { mode: { kind: "deathmatch", scoreLimit: 1 } });
    w.tanks[1]!.hp = 1;
    run(w, 40, { [w.tanks[0]!.id]: { fire: true } });
    const prev = { ...newProfile(), xp: xpToNext(1), perkProgress: { treads: 29 }, bonds: { vesper: 25 }, masteryKills: { m1: 14 }, totals: { ...newProfile().totals, kills: 149 } };
    const r = applyMatch(prev, w, w.tanks[0]!.id, { botsOnly: false, day: "2026-10-23" });
    expect(r.profile.perkProgress.treads).toBe(30);
    expect(r.profile.bonds.vesper).toBe(25 + 10 + 10 + 1);
    expect(r.unlocked).toEqual(expect.arrayContaining(["pro:treads", "bond:vesper:2", "oracle:sable", "upgrade:m1:3"]));
  });

  it("Oracles riding with your wingmen earn bond on the wingman's own kills", () => {
    const mission = campaignMissions.find((m) => m.allies.length >= 1)!;
    const w = createMissionWorld({ mission, players: ["m1"], bucks: 100, difficulty: "normal", allyOracles: [{ id: "ione", bond: 1 }] });
    const wingman = w.tanks[1]!;
    expect([wingman.oracle?.id, wingman.name]).toEqual(["ione", "Wingman · Ione"]);
    wingman.kills = 4;
    const r = applyMatch({ ...newProfile(), bonds: { ione: 0 } }, w, w.tanks[0]!.id, { botsOnly: true, day: "2026-10-23" });
    expect(r.profile.bonds.ione).toBe(10 + 4);
  });
});

