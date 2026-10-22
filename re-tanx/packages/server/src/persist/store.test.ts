import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newProfile } from "@re-tanx/sim";
import { createFileStore, createMemoryStore, type ProfileStore } from "./profileStore.ts";
import { createMariaStore } from "./mariaStore.ts";

// MariaDB runs only when TEST_DATABASE_URL points at a scratch database (it creates tables there)
const dbUrl = process.env.TEST_DATABASE_URL;
const stores: [string, () => Promise<ProfileStore>][] = [
  ["memory", async () => createMemoryStore()],
  ["files", async () => createFileStore(mkdtempSync(join(tmpdir(), "retanx-")))],
  ...(dbUrl ? [["mariadb", () => createMariaStore(dbUrl)] as [string, () => Promise<ProfileStore>]] : []),
];

describe.each(stores)("%s profile store", (_name, make) => {
  it("unknown players start fresh; updates persist", async () => {
    const s = await make();
    const id = `p${Math.random().toString(36).slice(2, 10)}`;
    expect(await s.get(id)).toEqual(newProfile());
    await s.update(id, (p) => ({ ...p, xp: p.xp + 250 }));
    expect((await s.get(id)).xp).toBe(250);
    await s.close?.();
  });

  it("concurrent updates for one player don't lose XP", async () => {
    const s = await make();
    const id = `c${Math.random().toString(36).slice(2, 10)}`;
    await Promise.all(Array.from({ length: 10 }, () => s.update(id, (p) => ({ ...p, xp: p.xp + 10 }))));
    expect((await s.get(id)).xp).toBe(100);
    await s.close?.();
  });

  it("leaderboard lists rated players best first", async () => {
    const s = await make();
    const tag = Math.random().toString(36).slice(2, 8);
    await s.update(`lb-hi-${tag}`, (p) => ({ ...p, name: `hi${tag}`, rating: { r: 3000, rd: 50, vol: 0.06, games: 9 } }));
    await s.update(`lb-lo-${tag}`, (p) => ({ ...p, name: `lo${tag}`, rating: { r: 2990, rd: 60, vol: 0.06, games: 9 } }));
    await s.update(`lb-none-${tag}`, (p) => ({ ...p, name: `none${tag}` }));
    const names = (await s.leaderboard(50)).map((r) => r.name);
    expect(names.indexOf(`hi${tag}`)).toBeLessThan(names.indexOf(`lo${tag}`));
    expect(names.indexOf(`lo${tag}`)).toBeGreaterThanOrEqual(0);
    expect(names).not.toContain(`none${tag}`);
    await s.close?.();
  });

  it("records matches and returns a player's history, newest first", async () => {
    const s = await make();
    const me = `h${Math.random().toString(36).slice(2, 10)}`;
    const base = { mapId: "neon", startedAt: 1_700_000_000_000, winnerTeam: 0, bots: 2 };
    const player = (over: object) => ({ playerId: me, name: "Me", team: 0, gang: "ironHounds", kills: 3, deaths: 1, xp: 120, place: 0, leftEarly: false, ratingDelta: undefined, ...over });
    await s.recordMatch({ ...base, mode: "deathmatch", endedAt: 1_700_000_100_000, ranked: false, players: [player({}), player({ playerId: `${me}x`, team: 1, place: 1 })] });
    await s.recordMatch({ ...base, mode: "lastGang", endedAt: 1_700_000_200_000, ranked: true, winnerTeam: 1, players: [player({ kills: 0, place: 1, ratingDelta: -12 })] });
    const h = await s.history(me, 10);
    expect(h.map((r) => [r.mode, r.won, r.place, r.players, r.ratingDelta])).toEqual([["lastGang", false, 1, 3, -12], ["deathmatch", true, 0, 4, undefined]]);
    expect(h[0]!.endedAt).toBe(1_700_000_200_000);
    expect(await s.history("nobody-at-all", 10)).toEqual([]);
    await s.close?.();
  });

  it("links sign-in identities to players", async () => {
    const s = await make();
    const sub = `u${Math.random().toString(36).slice(2, 10)}`;
    expect(await s.findIdentity("discord", sub)).toBeUndefined();
    await s.linkIdentity("discord", sub, "guest1");
    await s.linkIdentity("discord", sub, "someoneElse"); // first link wins
    expect(await s.findIdentity("discord", sub)).toBe("guest1");
    expect(await s.findIdentity("google", sub)).toBeUndefined();
    await s.close?.();
  });
});
