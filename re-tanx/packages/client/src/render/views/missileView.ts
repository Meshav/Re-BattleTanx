import * as THREE from "three";
import type { World } from "@re-tanx/sim";
import { toThree, toYaw } from "../scene.ts";
import { syncById } from "./syncById.ts";

const geo = new THREE.ConeGeometry(0.35, 1.6, 6).rotateZ(-Math.PI / 2);
const mats = { guided: new THREE.MeshBasicMaterial({ color: 0xff5a36 }), swarm: new THREE.MeshBasicMaterial({ color: 0xffc24a }), rocket: new THREE.MeshBasicMaterial({ color: 0xd8f05a }) };

export function syncMissiles(meshes: Map<number, THREE.Object3D>, world: World, parent: THREE.Object3D): void {
  syncById(meshes, world.missiles, parent, {
    create: (m) => new THREE.Mesh(geo, mats[m.kind]),
    update: (obj, m) => {
      obj.position.copy(toThree(m.pos.x, m.pos.y, 1.8));
      obj.rotation.y = toYaw(m.rot);
      obj.scale.setScalar(m.kind === "guided" ? 1.4 : m.kind === "rocket" ? 0.7 : 0.8);
    },
  });
}
