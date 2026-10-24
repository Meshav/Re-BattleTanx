import type { World } from "../world.ts";
import type { Tank } from "../entities/tank.ts";
import type { Pickup } from "../entities/pickup.ts";
import type { Missile } from "../entities/missile.ts";
import type { Mine } from "../entities/mine.ts";
import type { Nuke } from "../entities/nuke.ts";
import type { ModeState } from "../modes/mode.ts";
import type { Vec2 } from "../math/vec2.ts";
import type { Queen } from "../entities/queen.ts";
import type { Turret } from "../entities/turret.ts";
import type { CampaignState } from "../campaign/state.ts";
import type { BossState, Strike } from "../campaign/boss.ts";
import { noFx } from "../entities/tank.ts";

/** Changes every tick. */
export type TankHot = Pick<Tank, "id" | "kind" | "pos" | "rot" | "turretRot" | "speed" | "hp" | "alive" | "respawnIn" | "shield" | "kills" | "deaths" | "rosterIndex"> & { fx?: Partial<Tank["fx"]> };
/** Rarely changes: sent in full snapshots only. */
/** Loadout rides along so the client predicts its own tank's speed with the same perks / rank / Oracle as the server. */
export type TankMeta = Pick<Tank, "id" | "team" | "name" | "gang" | "roster" | "perks" | "pros" | "mastery" | "oracle">;
/** Only the owner needs it. */
export type TankPrivate = Pick<Tank, "id" | "specials" | "selected" | "heat" | "overheated">;

export interface Snapshot {
  tick: number;
  tanks: TankHot[];
  meta?: TankMeta[];
  me?: TankPrivate;
  projectiles: { id: number; pos: Vec2 }[];
  missiles: Pick<Missile, "id" | "ownerId" | "team" | "kind" | "pos" | "rot">[];
  mines: Pick<Mine, "id" | "team" | "pos">[];
  nukes: Pick<Nuke, "id" | "pos" | "fuse">[];
  queens: Queen[];
  /** rail Goliath riders (track geometry comes from the map) */
  rails?: (number | null)[];
  turrets: Pick<Turret, "id" | "team" | "pos" | "rot" | "hp">[];
  zone?: World["zone"];
  horde?: World["horde"];
  /** omitted when unchanged since the last snapshot to this client */
  pickups?: Pick<Pickup, "id" | "kind" | "pos" | "active" | "special">[];
  /** one digit per structure stage; omitted when unchanged */
  stages?: string;
  mode: ModeState;
  bots: number[];
  /** campaign co-op: objectives, shared wallet, pending redeploys, outcome (the mission def itself the client has by id) */
  campaign?: Omit<CampaignState, "mission">;
  bosses?: BossState[];
  strikes?: Strike[];
}

const campaignHot = ({ mission: _mission, ...c }: CampaignState): Omit<CampaignState, "mission"> => c;

export interface SnapshotFor { meId: number | undefined; full: boolean; stages: string | undefined; pickups: boolean }

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const rv = (p: Vec2): Vec2 => ({ x: r1(p.x), y: r1(p.y) });

export const structureStages = (world: World): string => world.structures.map((s) => s.stage).join("");
export const pickupsKey = (world: World): string => world.pickups.map((p) => `${p.id}${p.kind[0]}${p.active ? 1 : 0}`).join(",");

/** Only effects that are running (omitted entirely when none); the client fills the rest with zeros. */
function activeFx(t: Tank): { fx?: Partial<Tank["fx"]> } {
  const on = Object.entries(t.fx).filter(([, v]) => v > 0);
  return on.length ? { fx: Object.fromEntries(on.map(([k, v]) => [k, r1(v)])) } : {};
}

const hot = (t: Tank): TankHot => ({
  id: t.id, kind: t.kind, pos: rv(t.pos), rot: r2(t.rot), turretRot: r2(t.turretRot), speed: r1(t.speed),
  hp: Math.ceil(t.hp), alive: t.alive, respawnIn: r1(t.respawnIn), shield: Math.ceil(t.shield), kills: t.kills, deaths: t.deaths, rosterIndex: t.rosterIndex,
  ...activeFx(t),
});

export function makeSnapshot(world: World, o: SnapshotFor): Snapshot {
  const me = world.tanks.find((t) => t.id === o.meId);
  return {
    tick: world.tick,
    tanks: world.tanks.map(hot),
    ...(o.full ? { meta: world.tanks.map((t) => ({ id: t.id, team: t.team, name: t.name, gang: t.gang, roster: t.roster, perks: t.perks, pros: t.pros, mastery: t.mastery, oracle: t.oracle })) } : {}),
    ...(me ? { me: { id: me.id, specials: me.specials, selected: me.selected, heat: Math.round(me.heat), overheated: r1(me.overheated) } } : {}),
    projectiles: world.projectiles.map((p) => ({ id: p.id, pos: rv(p.pos) })),
    missiles: world.missiles.map((m) => ({ id: m.id, ownerId: m.ownerId, team: m.team, kind: m.kind, pos: rv(m.pos), rot: r2(m.rot) })),
    mines: world.mines.map((m) => ({ id: m.id, team: m.team, pos: rv(m.pos) })),
    nukes: world.nukes.map((n) => ({ id: n.id, pos: rv(n.pos), fuse: r1(n.fuse) })),
    queens: world.queens.map((q) => ({ ...q, pos: rv(q.pos), droppedFor: r1(q.droppedFor) })),
    ...(world.rails.length ? { rails: world.rails.map((r) => r.riderId ?? null) } : {}),
    ...(world.zone ? { zone: { ...world.zone, pos: rv(world.zone.pos), moveIn: r1(world.zone.moveIn) } } : {}),
    ...(world.horde ? { horde: { ...world.horde, waveTanks: [] } } : {}),
    turrets: world.turrets.map((t) => ({ id: t.id, team: t.team, pos: rv(t.pos), rot: r2(t.rot), hp: Math.ceil(t.hp) })),
    ...(o.pickups ? { pickups: world.pickups.map((p) => ({ id: p.id, kind: p.kind, pos: rv(p.pos), active: p.active, ...(p.special ? { special: p.special } : {}) })) } : {}),
    ...(o.stages !== undefined ? { stages: o.stages } : {}),
    mode: { ...world.mode, elapsed: r1(world.mode.elapsed) },
    bots: Object.keys(world.bots).map(Number),
    ...(world.campaign ? { campaign: campaignHot(world.campaign) } : {}),
    ...(world.bosses.length ? { bosses: world.bosses } : {}),
    ...(world.strikes.length ? { strikes: world.strikes.map((s) => ({ ...s, pos: rv(s.pos), fuse: r1(s.fuse) })) } : {}),
  };
}

function blankTank(h: TankHot): Tank {
  return {
    ...h, team: 0, name: "?", gang: undefined, roster: [h.kind], cooldown: 0, specials: {}, selected: undefined,
    specialCooldown: 0, shieldTime: 0, signatureSpent: false, stillFor: 0, slide: 0, heat: 0, overheated: 0, fx: noFx(), perks: [],
  };
}

/** Merge server state into a client-side mirror world. Fields the server didn't send keep their last value. */
export function applySnapshot(mirror: World, s: Snapshot): void {
  mirror.tick = s.tick;
  const old = new Map(mirror.tanks.map((t) => [t.id, t]));
  mirror.tanks = s.tanks.map((h) => Object.assign(old.get(h.id) ?? blankTank(h), h, { fx: { ...noFx(), ...h.fx } }));
  for (const m of s.meta ?? []) Object.assign(mirror.tanks.find((t) => t.id === m.id) ?? {}, m);
  if (s.me) Object.assign(mirror.tanks.find((t) => t.id === s.me!.id) ?? {}, s.me);
  mirror.projectiles = s.projectiles.map((p) => ({ ...p, ownerId: 0, vel: { x: 0, y: 0 }, damage: 0, splash: 0, ttl: 1 }));
  mirror.missiles = s.missiles.map((m) => ({ ...m, speed: 0, turnRate: 0, damage: 0, splash: 0, fuel: 1, targetId: undefined }));
  mirror.mines = s.mines.map((m) => ({ ...m, ownerId: 0, armIn: 0 }));
  mirror.nukes = s.nukes.map((n) => ({ ...n, ownerId: 0 }));
  mirror.queens = s.queens;
  // by index: ids differ between server and mirror (the mirror has no tanks when its rails are built)
  (s.rails ?? []).forEach((rider, i) => {
    const r = mirror.rails[i];
    if (r) r.riderId = rider ?? undefined;
  });
  mirror.zone = s.zone;
  mirror.horde = s.horde;
  mirror.turrets = s.turrets.map((t) => ({ ...t, ownerId: 0, life: 1, cooldown: 0 }));
  if (s.pickups) mirror.pickups = s.pickups.map((p) => ({ ...p, respawnIn: 0, fixed: true, random: false, life: Infinity }));
  if (s.stages) [...s.stages].forEach((ch, i) => { const st = mirror.structures[i]; if (st) st.stage = Number(ch); });
  mirror.mode = s.mode;
  if (s.campaign && mirror.campaign) Object.assign(mirror.campaign, s.campaign);
  mirror.bosses = s.bosses ?? [];
  mirror.strikes = s.strikes ?? [];
  mirror.bots = Object.fromEntries(s.bots.map((id) => [id, mirror.bots[id] ?? ({} as World["bots"][number])]));
}
