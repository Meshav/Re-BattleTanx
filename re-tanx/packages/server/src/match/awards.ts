import { applyMatch, displayRating, finalScore, newRating, rateMatch, today, type MatchResult, type World } from "@re-tanx/sim";
import type { Services } from "../services.ts";
import type { MatchRecord } from "../persist/profileStore.ts";
import { send } from "../client.ts";
import type { Match } from "./match.ts";

/** FFA finishing order: team score (kills, rounds…) then kills. Players who left count as last. 0 = first; ties share a place. */
export function placements(m: Match, world: World): number[] {
  const key = (i: number) => {
    const seat = m.seats[i]!;
    const t = world.tanks.find((k) => k.id === seat.tankId);
    if (!seat.client || !t) return -Infinity;
    return (world.mode.scores[t.team] ?? 0) * 1000 + t.kills;
  };
  const keys = m.seats.map((_, i) => key(i));
  return keys.map((k) => keys.filter((o) => o > k).length);
}

/** Server-side XP (doc 07 §7.9) and, in ranked lobbies, Glicko-2 ratings: computed from the authoritative world, saved, then sent. */
export async function awardMatch(m: Match, world: World, svc: Services): Promise<void> {
  const humans = m.seats.filter((s) => s.client).length;
  const rated = m.ranked && m.seats.length >= 2 ? await ratings(m, world, svc) : undefined;
  const xp: number[] = m.seats.map(() => 0);
  await Promise.all(m.seats.map(async (seat, i) => {
    if (!seat.profileId) return;
    const c = seat.client;
    let result: MatchResult | undefined;
    await svc.store.update(seat.profileId, (p) => {
      const named = { ...p, name: seat.name };
      if (!c) return rated ? { ...named, rating: rated.after[i] } : named; // left early: rating still counts, no XP
      const grade = world.campaign?.outcome === "won" ? finalScore(world).grade : undefined;
      result = applyMatch(named, world, seat.tankId, { botsOnly: humans <= 1, day: today(), ...(grade ? { grade } : {}) });
      if (rated) {
        result.profile.rating = rated.after[i];
        result.rating = { before: displayRating(rated.before[i]!), after: displayRating(rated.after[i]!) };
      }
      return result.profile;
    });
    if (c && result) {
      xp[i] = result.award.total;
      c.profile = result.profile;
      send(c, { t: "progress", result });
    }
  }));
  await svc.store.recordMatch(matchRecord(m, world, xp, rated));
}

function matchRecord(m: Match, world: World, xp: number[], rated: Awaited<ReturnType<typeof ratings>> | undefined): MatchRecord {
  const place = placements(m, world);
  const humans = new Set(m.seats.map((s) => s.tankId));
  return {
    mode: world.mode.kind, mapId: world.map.id, startedAt: m.startedAt, endedAt: Date.now(), winnerTeam: world.mode.winner, ranked: m.ranked,
    bots: world.tanks.filter((t) => !humans.has(t.id)).length,
    players: m.seats.flatMap((s, i) => {
      const t = world.tanks.find((k) => k.id === s.tankId);
      if (!s.profileId || !t) return [];
      return [{ playerId: s.profileId, name: s.name, team: t.team, gang: t.gang, kills: t.kills, deaths: t.deaths, xp: xp[i]!, place: place[i]!, leftEarly: !s.client,
        ratingDelta: rated ? displayRating(rated.after[i]!) - displayRating(rated.before[i]!) : undefined }];
    }),
  };
}

async function ratings(m: Match, world: World, svc: Services) {
  const before = await Promise.all(m.seats.map(async (s) => (s.profileId ? (await svc.store.get(s.profileId)).rating : undefined) ?? newRating()));
  const place = placements(m, world);
  return { before, after: rateMatch(before.map((rating, i) => ({ rating, place: place[i]! }))) };
}
