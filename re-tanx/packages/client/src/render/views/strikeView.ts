import * as THREE from "three";
import type { World } from "@re-tanx/sim";
import { toThree } from "../scene.ts";
import { syncById } from "./syncById.ts";

const ring = new THREE.RingGeometry(0.85, 1, 32).rotateX(-Math.PI / 2);
const RADIUS = 5;

/** Boss artillery markers: red rings that shrink and flash as the shell comes down. */
export function syncStrikes(objs: Map<number, THREE.Object3D>, world: World, parent: THREE.Object3D): void {
  syncById(objs, world.strikes, parent, {
    create: () => new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, side: THREE.DoubleSide, depthWrite: false })),
    update: (obj, s) => {
      obj.position.copy(toThree(s.pos.x, s.pos.y, 0.15));
      obj.scale.setScalar(RADIUS * (0.6 + s.fuse * 0.4));
      ((obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.4 + 0.5 * Math.abs(Math.sin(s.fuse * 18));
    },
  });
}
