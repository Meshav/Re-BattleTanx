import * as THREE from "three";
import { specialDefs, type SimEvent, type Tank, type World } from "@re-tanx/sim";
import { createTankView, updateTankView, type Pose, type TankView } from "./views/tankView.ts";
import { createStructureViews, fadeOccluders, syncStructures, type StructureViews } from "./views/structureView.ts";
import { syncProjectiles } from "./views/projectileView.ts";
import { syncMissiles } from "./views/missileView.ts";
import { syncMines } from "./views/mineView.ts";
import { syncNukes } from "./views/nukeView.ts";
import { syncPickups } from "./views/pickupView.ts";
import { syncQueens } from "./views/queenView.ts";
import { createFortresses } from "./views/fortressView.ts";
import { createBeacons } from "./views/beaconView.ts";
import { syncTurrets } from "./views/turretView.ts";
import { createZoneView, updateZoneView, type ZoneView } from "./views/zoneView.ts";
import { syncStrikes } from "./views/strikeView.ts";
import { createRails, updateRails } from "./views/railView.ts";
import { applyCloak } from "./views/tankView.ts";
import { createGround } from "./views/groundView.ts";
import { createEffects, spawnFromEvents, updateEffects, type Effects } from "./fx/effects.ts";

export interface WorldView {
  root: THREE.Group;
  tanks: Map<number, TankView>;
  structures: StructureViews;
  projectiles: Map<number, THREE.Object3D>;
  missiles: Map<number, THREE.Object3D>;
  mines: Map<number, THREE.Object3D>;
  nukes: Map<number, THREE.Object3D>;
  pickups: Map<number, THREE.Object3D>;
  queens: Map<number, THREE.Object3D>;
  turrets: Map<number, THREE.Object3D>;
  zone: ZoneView;
  strikes: Map<number, THREE.Object3D>;
  rails: ReturnType<typeof createRails>;
  fx: Effects;
}

export function createWorldView(scene: THREE.Scene, world: World): WorldView {
  const root = new THREE.Group();
  scene.add(root);
  const rails = createRails(world);
  root.add(createGround(world), createFortresses(world), createBeacons(world), rails.root);
  return {
    rails,
    root, tanks: new Map(), projectiles: new Map(), missiles: new Map(), mines: new Map(), nukes: new Map(), pickups: new Map(), queens: new Map(), turrets: new Map(),
    fx: createEffects(root), zone: createZoneView(root), strikes: new Map(),
    structures: createStructureViews(world, root),
  };
}

export type Poses = Map<number, Pose>;

export const capturePoses = (world: World): Poses =>
  new Map(world.tanks.map((t) => [t.id, { x: t.pos.x, y: t.pos.y, rot: t.rot, turretRot: t.turretRot }]));

/** Interpolated pose between the previous and current tick. */
export function poseAt(prev: Poses, world: World, id: number, alpha: number): Pose | undefined {
  const t = world.tanks.find((k) => k.id === id);
  if (!t) return undefined;
  const p = prev.get(id);
  const cur = { x: t.pos.x, y: t.pos.y, rot: t.rot, turretRot: t.turretRot };
  if (!p || Math.hypot(p.x - cur.x, p.y - cur.y) > 20) return cur; // respawn teleport: no smear
  return { x: lerp(p.x, cur.x, alpha), y: lerp(p.y, cur.y, alpha), rot: lerpAngle(p.rot, cur.rot, alpha), turretRot: lerpAngle(p.turretRot, cur.turretRot, alpha) };
}

export function renderWorld(v: WorldView, world: World, prev: Poses, alpha: number, dt: number, players?: Poses): void {
  for (const t of world.tanks) {
    let tv = v.tanks.get(t.id);
    if (tv && tv.kind !== t.kind) {
      v.root.remove(tv.root); // roster moved on to a different tank model
      tv = undefined;
    }
    if (!tv) {
      tv = createTankView(t);
      v.tanks.set(t.id, tv);
      v.root.add(tv.root);
    }
    updateTankView(tv, t, players?.get(t.id) ?? poseAt(prev, world, t.id, alpha)!);
  }
  syncStructures(v.structures, world);
  syncProjectiles(v.projectiles, world, v.root);
  syncMissiles(v.missiles, world, v.root);
  syncNukes(v.nukes, world, v.root);
  syncPickups(v.pickups, world, v.root);
  syncQueens(v.queens, world, v.root);
  syncTurrets(v.turrets, world, v.root);
  updateZoneView(v.zone, world);
  syncStrikes(v.strikes, world, v.root);
  updateRails(v.rails, world);
  updateEffects(v.fx, dt);
}

/** Per-viewport bits that depend on who is looking (enemy mines stay hidden beyond a few metres). */
export function syncViewerOnly(v: WorldView, world: World, viewer: Tank): void {
  syncMines(v.mines, world, v.root, viewer);
  for (const t of world.tanks) {
    const tv = v.tanks.get(t.id);
    if (tv) applyCloak(tv, t, viewer, specialDefs.cloak.revealRange);
  }
}

export const onSimEvents = (v: WorldView, events: SimEvent[], world: World): void => spawnFromEvents(v.fx, events, world);
export const fadeFor = (v: WorldView, cam: THREE.Camera, target: THREE.Vector3): void => fadeOccluders(v.structures, cam, target);

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpAngle = (a: number, b: number, k: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
