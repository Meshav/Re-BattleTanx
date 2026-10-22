import * as THREE from "three";
import type { World } from "@re-tanx/sim";
import { toThree } from "../scene.ts";
import { teamColor } from "../teamColors.ts";

/** King of the Rubble hill: a glowing ring + light column, tinted by whoever holds it. */
export interface ZoneView { group: THREE.Group; ring: THREE.Mesh; column: THREE.Mesh }

export function createZoneView(parent: THREE.Object3D): ZoneView {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  const column = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
  const group = new THREE.Group();
  group.add(ring, column);
  group.visible = false;
  parent.add(group);
  return { group, ring, column };
}

export function updateZoneView(v: ZoneView, world: World): void {
  const z = world.zone;
  v.group.visible = !!z;
  if (!z) return;
  v.group.position.copy(toThree(z.pos.x, z.pos.y, 0.1));
  v.ring.scale.set(z.radius, 1, z.radius);
  v.column.scale.set(z.radius, 18, z.radius);
  v.column.position.y = 9;
  const color = z.holder >= 0 ? teamColor(z.holder) : z.holder === -2 ? 0xff4040 : 0xffffff;
  (v.ring.material as THREE.MeshBasicMaterial).color.setHex(color);
  (v.column.material as THREE.MeshBasicMaterial).color.setHex(color);
}
