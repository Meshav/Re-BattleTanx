import * as THREE from "three";
import type { World } from "@re-tanx/sim";

/** Asphalt plane with faint lane lines on every cell edge. */
export function createGround(world: World): THREE.Object3D {
  const { cols, rows, cell } = world.map;
  const w = cols * cell, h = rows * cell;
  const group = new THREE.Group();
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w + 200, h + 200), new THREE.MeshStandardMaterial({ color: 0x3b3a36, roughness: 1 }));
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(w / 2, 0, h / 2);
  plane.receiveShadow = true;
  const grid = new THREE.GridHelper(Math.max(w, h), Math.max(cols, rows), 0x55534c, 0x4a4843);
  grid.position.set(Math.max(w, h) / 2, 0.02, Math.max(w, h) / 2);
  group.add(plane, grid);
  const water = waterTiles(world);
  if (water) group.add(water);
  return group;
}

/** One instanced plane per '~' cell, slightly above the asphalt. */
function waterTiles(world: World): THREE.Object3D | undefined {
  const { cols, cell } = world.map;
  const cells = world.map.water.flatMap((w, i) => (w ? [i] : []));
  if (!cells.length) return undefined;
  const geo = new THREE.PlaneGeometry(cell, cell).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x2e5f7a, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.9 });
  const mesh = new THREE.InstancedMesh(geo, mat, cells.length);
  const m = new THREE.Matrix4();
  cells.forEach((i, k) => mesh.setMatrixAt(k, m.makeTranslation(((i % cols) + 0.5) * cell, 0.05, (Math.floor(i / cols) + 0.5) * cell)));
  mesh.receiveShadow = true;
  return mesh;
}
