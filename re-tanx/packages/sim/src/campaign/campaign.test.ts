import { describe, expect, it } from "vitest";
import type { MissionDef } from "./missionDefs.ts";
import { createMissionWorld } from "./createMission.ts";
import { deployCost, deployTank } from "./deploy.ts";
import { finalScore } from "./scoring.ts";
import { stepWorld } from "../stepWorld.ts";
import { applyDamage, damageStructure } from "../systems/applyDamage.ts";
import { parseMap } from "../data/map.ts";
import { dist } from "../math/vec2.ts";
import { campaignMissions } from "../data/missions.ts";
import { blocksTank, cellOf, structureAt } from "../queries/cells.ts";
import { createWorld } from "../world.ts";
import type { World } from "../world.ts";

const missions = campaignMissions;
const start = (m: MissionDef, bucks = 30) => createMissionWorld({ mission: m, players: ["m1"], bucks, difficulty: "normal", seed: 3 });

/** Cheat through a mission the way a perfect player would: one objective step per tick. */
function cheat(w: World): void {
  const me = w.tanks[0]!;
  for (const t of w.tanks) if (t.team !== 0 && t.alive) applyDamage(w, { target: t, amount: 9999, sourceId: me.id, from: t.pos });
  for (const s of w.structures) if (s.kind === "target") damageStructure(s, 9999);
  w.turrets = w.turrets.filter((t) => t.team === 0);
  const q = w.queens[0];
  const goTo = w.map.reach.find((r) => dist(r, me.pos) > 3)
    ?? (q && q.state !== "carried" && q.home !== w.map.extraction[0] ? q.pos : undefined)
    ?? (q?.carrierId === me.id ? w.map.extraction[0] : undefined);
  if (goTo && me.alive) me.pos = { ...goTo };
}

describe("campaign data", () => {
  for (const m of missions) {
    it(`${m.id} has the map markers its objectives need`, () => {
      const map = parseMap(m.map);
      const kinds = m.objectives.map((o) => o.kind);
      if (kinds.includes("reach")) expect(map.reach.length).toBeGreaterThan(0);
      if (kinds.includes("rescue")) expect(map.captives.length * map.extraction.length).toBeGreaterThan(0);
      if (kinds.includes("destroyTargets")) expect(map.structures.some((s) => s.kind === "target")).toBe(true);
      if (kinds.includes("caches")) expect(map.pickups.some((p) => p.hidden)).toBe(true);
      if (kinds.includes("stopRunners")) expect(map.exits.length).toBeGreaterThan(0);
      if (kinds.includes("destroyTurrets")) expect(map.enemyTurrets.length).toBeGreaterThan(0);
      if (m.waves.some((wv) => wv.boss)) expect(m.objectives.some((o) => o.kind === "destroyAll")).toBe(true);
      expect(map.enemySpawns.length).toBeGreaterThan(0);
      expect(map.spawns.length).toBeGreaterThan(0);
    });

    it(`${m.id}: every place the player must go can be driven to from the start`, () => {
      const w = createWorld(parseMap(m.map), []);
      const { cols, rows } = w.map;
      const seen = new Set<number>();
      const start = cellOf(w, w.map.spawns[0]!);
      const queue = [[start.cx, start.cy]];
      seen.add(start.cy * cols + start.cx);
      while (queue.length) {
        const [x, y] = queue.pop()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x! + dx!, ny = y! + dy!;
          // walls are meant to be breached (cheap, low HP); buildings count as solid
          const wall = structureAt(w, nx, ny)?.kind === "wall";
          if (seen.has(ny * cols + nx) || (!wall && blocksTank(w, nx, ny, false))) continue;
          seen.add(ny * cols + nx);
          queue.push([nx, ny]);
        }
      }
      const open = (p: { x: number; y: number }) => { const c = cellOf(w, p); return seen.has(c.cy * cols + c.cx); };
      // structures (targets) only need a reachable neighbour; markers need their own cell
      const nextTo = (cx: number, cy: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((cy + dy!) * cols + cx + dx!));
      for (const p of [...w.map.spawns, ...w.map.reach, ...w.map.captives, ...w.map.extraction, ...w.map.exits, ...w.map.enemySpawns]) expect(open(p), `${m.id} marker at ${p.x},${p.y}`).toBe(true);
      for (const s of w.map.structures.filter((k) => k.kind === "target")) expect(nextTo(s.cx, s.cy), `${m.id} target ${s.cx},${s.cy}`).toBe(true);
      expect(rows * cols).toBeGreaterThan(0);
    });

    it(`${m.id} can be won, pays its reward and grades the run`, () => {
      const w = start(m);
      for (let i = 0; i < 30 * 200 && !w.mode.over; i++) {
        cheat(w);
        stepWorld(w);
      }
      const c = w.campaign!;
      expect(c.outcome).toBe("won");
      expect(c.bucks).toBeGreaterThanOrEqual(30 - deployCost(c, "m1") + m.reward);
      expect(["S", "A", "B", "C"]).toContain(finalScore(w).grade);
    });
  }
});

describe("tank bucks", () => {
  const m = missions[2]!;

  it("dead players wait for a paid deploy, then respawn in the tank they bought", () => {
    const w = start(m);
    const me = w.tanks[0]!;
    const before = w.campaign!.bucks;
    applyDamage(w, { target: me, amount: 9999, sourceId: 0, from: me.pos });
    for (let i = 0; i < 200; i++) stepWorld(w);
    expect(me.alive).toBe(false);
    expect(deployTank(w, me.id, "moto")).toBe(true);
    expect(deployTank(w, me.id, "goliath")).toBe(false); // one order at a time
    for (let i = 0; i < 120; i++) stepWorld(w);
    expect(me).toMatchObject({ alive: true, kind: "moto" });
    expect(w.campaign!.bucks).toBe(before - deployCost(w.campaign!, "moto"));
    expect(w.campaign!.playerDeaths).toBe(1);
  });

  it("running out of bucks with no tank fails the mission", () => {
    const w = start(m, 10); // exactly one m1, nothing left after
    const me = w.tanks[0]!;
    applyDamage(w, { target: me, amount: 9999, sourceId: 0, from: me.pos });
    w.pickups = [];
    for (let i = 0; i < 5; i++) stepWorld(w);
    expect(w.campaign!).toMatchObject({ outcome: "lost", failReason: "Out of Tank Bucks" });
    expect(w.mode.over).toBe(true);
  });

  it("caches appear when the building above them falls, and pay out", () => {
    const w = start(missions[0]!);
    const cache = w.pickups.find((p) => p.kind === "bucks" && !p.active)!;
    const s = w.structures[cache.under!]!;
    const bucks = w.campaign!.bucks;
    damageStructure(s, 9999);
    stepWorld(w);
    expect(cache.active).toBe(true);
    w.tanks[0]!.pos = { ...cache.pos };
    stepWorld(w);
    expect(w.campaign!.bucks).toBe(bucks + 5);
  });
});

describe("wingmen", () => {
  it("follow the player", () => {
    const quiet: MissionDef = { ...missions[2]!, waves: [], objectives: [{ kind: "survive", label: "", seconds: 999 }] };
    const w = start(quiet);
    const [me, wing] = [w.tanks[0]!, w.tanks[1]!];
    me.pos = { x: 115, y: 75 };
    for (let i = 0; i < 30 * 15; i++) stepWorld(w);
    expect(dist(me.pos, wing.pos)).toBeLessThan(25);
  });
});
