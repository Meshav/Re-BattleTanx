import * as THREE from "three";
import type { World } from "@re-tanx/sim";
import { toThree } from "../scene.ts";
import { syncById } from "./syncById.ts";

const geo = new THREE.CylinderGeometry(1.2, 1.4, 2.4, 12);

/** Squat canister that blinks faster as the fuse runs down. */
export function syncNukes(meshes: Map<number, THREE.Object3D>, world: World, parent: THREE.Object3D): void {
  syncById(meshes, world.nukes, parent, {
    create: () => new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xff2200 })),
    update: (obj, n) => {
      obj.position.copy(toThree(n.pos.x, n.pos.y, 1.2));
      const rate = 2 + (5 - n.fuse) * 3;
      const on = Math.sin(performance.now() / 1000 * rate * Math.PI) > 0;
      ((obj as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 1.5 : 0.1;
    },
  });
}
