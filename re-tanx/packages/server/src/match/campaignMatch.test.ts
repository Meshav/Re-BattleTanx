import { describe, expect, it } from "vitest";
import type { WebSocket } from "ws";
import { campaignMissions, coopBucks, deployCost, gangIds, newProfile, sanitizeSettings, type Profile, type ServerMsg } from "@re-tanx/sim";
import { createMatch } from "./match.ts";
import { awardMatch } from "./awards.ts";
import { createMemoryStore } from "../persist/profileStore.ts";
import { createTokens } from "../auth/guestToken.ts";
import type { Client } from "../client.ts";

const veteran = (extra: Partial<Profile> = {}): Profile => ({ ...newProfile(), xp: 1e9, totals: { ...newProfile().totals, missions: 6, kills: 500, structures: 500 }, ...extra });

function client(id: number, profile: Profile, extra: Partial<Client> = {}): Client & { sent: ServerMsg[] } {
  const sent: ServerMsg[] = [];
  const ws = { OPEN: 1, readyState: 1, send: (s: string) => sent.push(JSON.parse(s) as ServerMsg) } as unknown as WebSocket;
  return { id, ws, name: `Pilot${id}`, gang: gangIds[0]!, lobby: undefined, inputTimes: [], ctrlTimes: [], profileId: `p${id}`, profile, perks: [], sent, ...extra };
}

describe("campaign co-op", () => {
  const mission = campaignMissions.find((m) => m.allies.length >= 2)!;
  const settings = sanitizeSettings({ mode: "campaign", mission: mission.id, difficulty: "normal", public: true, ranked: true });

  it("settings: invite-only, upgrades on, a real mission", () => {
    expect(settings).toMatchObject({ mode: "campaign", mission: mission.id, public: false, ranked: false, perks: true });
    expect(sanitizeSettings({ mode: "campaign", mission: "nope" }).mode).toBe("deathmatch");
  });

  it("each player brings their own loadout; the host's Oracles ride with the wingmen; the wallet is the server's", () => {
    const host = client(1, veteran({ oracle: "vesper" }), { oracle: "vesper", wingmen: ["ione", "vesper", "sable"], tank: "goliath", perks: ["treads"] });
    const guest = client(2, veteran(), { oracle: "marrow", tank: "m1", perks: ["scavenger"] });
    const m = createMatch(mission.map, settings, [host, guest]);
    const [a, b] = m.seats.map((s) => m.world.tanks.find((t) => t.id === s.tankId)!);
    expect([a!.name, a!.kind, a!.perks, a!.oracle?.id]).toEqual(["Pilot1", "goliath", ["treads"], "vesper"]);
    expect([b!.name, b!.kind, b!.perks, b!.oracle?.id]).toEqual(["Pilot2", "m1", ["scavenger"], "marrow"]);
    const wingmen = m.world.tanks.filter((t) => m.world.bots[t.id]?.leaderId === a!.id);
    expect(wingmen.map((t) => t.oracle?.id)).toEqual(["ione", "sable", ...Array(Math.max(0, mission.allies.length - 2)).fill(undefined)].slice(0, mission.allies.length));
    const c = m.world.campaign!;
    expect(c.bucks).toBe(coopBucks(mission.id) - deployCost(c, "goliath") - deployCost(c, "m1"));
  });

  it("both players earn campaign XP and bond", async () => {
    const store = createMemoryStore();
    const host = client(1, veteran(), { oracle: "vesper" });
    const guest = client(2, veteran(), { oracle: "ione" });
    await store.update("p1", () => veteran());
    await store.update("p2", () => veteran());
    const m = createMatch(mission.map, settings, [host, guest]);
    Object.assign(m.world.campaign!, { outcome: "won" });
    Object.assign(m.world.mode, { over: true, winner: 0 });
    await awardMatch(m, m.world, { tokens: createTokens("t"), store });
    for (const [id, oracle] of [["p1", "vesper"], ["p2", "ione"]] as const) {
      const p = await store.get(id);
      expect(p.totals.missions).toBe(7);
      expect(p.bonds[oracle]).toBeGreaterThan(0);
    }
  });
});
