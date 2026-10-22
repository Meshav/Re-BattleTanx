import * as THREE from "three";
import type { World } from "@re-tanx/sim";
import { toThree } from "../scene.ts";
import { syncById } from "./syncById.ts";

const geo = new THREE.SphereGeometry(0.35, 8, 6);
const mat = new THREE.MeshBasicMaterial({ color: 0xffe08a });

export function syncProjectiles(meshes: Map<number, THREE.Object3D>, world: World, parent: THREE.Object3D): void {
  syncById(meshes, world.projectiles, parent, {
    create: () => new THREE.Mesh(geo, mat),
    // shortcut: lobbed mortar shells just fly high; a true arc needs the launch point (add if it reads badly)
    update: (obj, p) => obj.position.copy(toThree(p.pos.x, p.pos.y, p.lobbed ? 7 : 1.6)),
  });
}
