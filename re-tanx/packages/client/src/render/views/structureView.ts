import * as THREE from "three";
import type { Structure, World } from "@re-tanx/sim";

const HEIGHT = { building: 9, wall: 3, target: 6, core: 12 } as const;
const COLORS = [0x9c8f7a, 0x7a6e5d, 0x4d463c];
const TARGET_COLORS = [0xc0432f, 0x8a3324, 0x4d2a22];
const CORE_COLORS = [0x3fb8d9, 0x2a7a90, 0x2b3a40];
const geo = new THREE.BoxGeometry(1, 1, 1);
const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
const shape = new THREE.Object3D();
const color = new THREE.Color();

export interface StructureViews {
  solid: THREE.InstancedMesh; faded: THREE.InstancedMesh; stages: number[];
  matrices: THREE.Matrix4[]; bounds: THREE.Box3[]; occluded: Set<number>;
}

/** The city takes one opaque draw call, plus one for buildings obscuring this viewport. */
export function createStructureViews(world: World, parent: THREE.Object3D): StructureViews {
  const count = world.structures.length;
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });
  const solid = new THREE.InstancedMesh(geo, mat, count);
  const fadeMat = mat.clone();
  fadeMat.transparent = true;
  fadeMat.opacity = 0.28;
  fadeMat.depthWrite = false;
  const faded = new THREE.InstancedMesh(geo, fadeMat, count);
  faded.count = 0;
  solid.castShadow = solid.receiveShadow = true;
  solid.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  faded.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  parent.add(solid, faded);
  const views: StructureViews = {
    solid, faded, stages: world.structures.map(() => -1), occluded: new Set(),
    matrices: world.structures.map(() => new THREE.Matrix4()), bounds: world.structures.map(() => new THREE.Box3()),
  };
  syncStructures(views, world);
  // Buildings only shrink; these initial bounds remain valid after destruction/fading.
  solid.computeBoundingSphere();
  return views;
}

/** Re-shape only the structures whose stage changed. */
export function syncStructures(views: StructureViews, world: World): void {
  world.structures.forEach((s, i) => {
    if (views.stages[i] === s.stage) return;
    views.stages[i] = s.stage;
    const full = HEIGHT[s.kind];
    const h = s.stage === 0 ? full : s.stage === 1 ? full * 0.55 : 0.8;
    const width = world.map.cell * (s.stage === 2 ? 0.9 : 0.96);
    const x = (s.cx + 0.5) * world.map.cell, z = (s.cy + 0.5) * world.map.cell;
    shape.scale.set(width, h, width);
    shape.position.set(x, h / 2, z);
    shape.updateMatrix();
    views.matrices[i]!.copy(shape.matrix);
    views.bounds[i]!.min.set(x - width / 2, 0, z - width / 2);
    views.bounds[i]!.max.set(x + width / 2, h, z + width / 2);
    views.solid.setMatrixAt(i, views.occluded.has(i) ? hidden : shape.matrix);
    views.solid.setColorAt(i, color.setHex(palette(s)[s.stage]!));
    views.solid.instanceMatrix.needsUpdate = true;
    views.solid.instanceColor!.needsUpdate = true;
  });
}

const palette = (s: Structure) => s.kind === "target" ? TARGET_COLORS : s.kind === "core" ? CORE_COLORS : COLORS;
const ray = new THREE.Ray();
const dir = new THREE.Vector3();
const hit = new THREE.Vector3();

/** Box intersections avoid triangle raycasts/material changes across hundreds of buildings each frame. */
export function fadeOccluders(views: StructureViews, camera: THREE.Camera, target: THREE.Vector3): void {
  ray.set(camera.position, dir.copy(target).sub(camera.position).normalize());
  const farSq = camera.position.distanceToSquared(target);
  const next = new Set<number>();
  let count = 0;
  for (let i = 0; i < views.bounds.length; i++) {
    const box = views.bounds[i]!;
    if (!box.containsPoint(camera.position) && (!ray.intersectBox(box, hit) || camera.position.distanceToSquared(hit) > farSq)) continue;
    next.add(i);
    if (!views.occluded.has(i)) {
      views.solid.setMatrixAt(i, hidden);
      views.solid.instanceMatrix.needsUpdate = true;
    }
    views.faded.setMatrixAt(count, views.matrices[i]!);
    views.solid.getColorAt(i, color);
    views.faded.setColorAt(count++, color);
  }
  for (const i of views.occluded) if (!next.has(i)) {
    views.solid.setMatrixAt(i, views.matrices[i]!);
    views.solid.instanceMatrix.needsUpdate = true;
  }
  views.occluded = next;
  views.faded.count = count;
  if (count) {
    views.faded.instanceMatrix.needsUpdate = true;
    views.faded.instanceColor!.needsUpdate = true;
    views.faded.computeBoundingSphere();
  }
}
