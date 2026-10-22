import * as THREE from "three";
import { specialDefs, type Tank, type World } from "@re-tanx/sim";
import { toThree } from "../scene.ts";
import { syncById } from "./syncById.ts";

const geo = new THREE.CylinderGeometry(0.9, 1.1, 0.35, 10);
const own = new THREE.MeshStandardMaterial({ color: 0x2f6f3a, emissive: 0x0a3a12 });
const enemy = new THREE.MeshStandardMaterial({ color: 0x7a2a22, emissive: 0x3a0a08 });

/** Enemy mines only show up close (original: cloaked beyond a few metres). */
export function syncMines(meshes: Map<number, THREE.Object3D>, world: World, parent: THREE.Object3D, viewer: Tank): void {
  syncById(meshes, world.mines, parent, {
    create: (m) => new THREE.Mesh(geo, m.team === viewer.team ? own : enemy),
    update: (obj, m) => {
      obj.position.copy(toThree(m.pos.x, m.pos.y, 0.2));
      const near = Math.hypot(m.pos.x - viewer.pos.x, m.pos.y - viewer.pos.y) <= specialDefs.mine.hiddenBeyond;
      obj.visible = m.team === viewer.team || near;
    },
  });
}
