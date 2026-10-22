import * as THREE from "three";
import type { Structure, World } from "@re-tanx/sim";

const HEIGHT = { building: 9, wall: 3, target: 6, core: 12 } as const;
const COLORS = [0x9c8f7a, 0x7a6e5d, 0x4d463c];
const TARGET_COLORS = [0xc0432f, 0x8a3324, 0x4d2a22];
const CORE_COLORS = [0x3fb8d9, 0x2a7a90, 0x2b3a40];
const mats = COLORS.map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true }));
const geo = new THREE.BoxGeometry(1, 1, 1);

export interface StructureViews { meshes: THREE.Mesh[]; stages: number[] }

export function createStructureViews(world: World, parent: THREE.Object3D): StructureViews {
  const meshes = world.structures.map((s) => {
    const m = new THREE.Mesh(geo, mats[0]!.clone());
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  });
  const views: StructureViews = { meshes, stages: world.structures.map(() => -1) };
  syncStructures(views, world);
  return views;
}

/** Re-shape only the structures whose stage changed. */
export function syncStructures(views: StructureViews, world: World): void {
  world.structures.forEach((s, i) => {
    if (views.stages[i] === s.stage) return;
    views.stages[i] = s.stage;
    shape(views.meshes[i]!, s, world.map.cell);
  });
}

function shape(m: THREE.Mesh, s: Structure, cell: number): void {
  const full = HEIGHT[s.kind];
  const h = s.stage === 0 ? full : s.stage === 1 ? full * 0.55 : 0.8;
  const inset = s.stage === 2 ? 0.9 : 0.96;
  m.scale.set(cell * inset, h, cell * inset);
  m.position.set((s.cx + 0.5) * cell, h / 2, (s.cy + 0.5) * cell);
  const palette = s.kind === "target" ? TARGET_COLORS : s.kind === "core" ? CORE_COLORS : COLORS;
  (m.material as THREE.MeshStandardMaterial).color.setHex(palette[s.stage] ?? palette[0]!);
}

const ray = new THREE.Raycaster();

/** Fade buildings standing between the camera and the player so the tank stays visible. */
export function fadeOccluders(views: StructureViews, camera: THREE.Camera, target: THREE.Vector3): void {
  for (const m of views.meshes) setOpacity(m, 1);
  const dir = target.clone().sub(camera.position);
  ray.set(camera.position, dir.normalize());
  ray.far = camera.position.distanceTo(target);
  for (const hit of ray.intersectObjects(views.meshes, false)) setOpacity(hit.object as THREE.Mesh, 0.28);
}

function setOpacity(m: THREE.Mesh, o: number): void {
  const mat = m.material as THREE.MeshStandardMaterial;
  mat.transparent = o < 1;
  mat.opacity = o;
  mat.depthWrite = o === 1;
}
