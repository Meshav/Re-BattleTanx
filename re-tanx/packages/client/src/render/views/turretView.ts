import * as THREE from "three";
import type { World } from "@re-tanx/sim";
import { toThree, toYaw } from "../scene.ts";
import { syncById } from "./syncById.ts";
import { teamColor } from "../teamColors.ts";
import { part } from "./tankModels.ts";

const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.6, 6);
const headGeo = new THREE.BoxGeometry(1.2, 0.6, 0.9);
const gunGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6).rotateZ(Math.PI / 2);
const steel = new THREE.MeshStandardMaterial({ color: 0x3a3a38 });

function build(team: number): THREE.Object3D {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const leg = part(legGeo, steel, Math.cos((i * Math.PI * 2) / 3) * 0.5, 0.7, Math.sin((i * Math.PI * 2) / 3) * 0.5);
    leg.rotation.set(Math.sin(i) * 0.3, 0, Math.cos(i) * 0.3);
    g.add(leg);
  }
  const head = new THREE.Group();
  head.name = "head";
  head.position.y = 1.6;
  head.add(part(headGeo, new THREE.MeshStandardMaterial({ color: teamColor(team) })), part(gunGeo, steel, 0.9));
  g.add(head);
  return g;
}

export function syncTurrets(objs: Map<number, THREE.Object3D>, world: World, parent: THREE.Object3D): void {
  syncById(objs, world.turrets, parent, {
    create: (t) => build(t.team),
    update: (obj, t) => {
      obj.position.copy(toThree(t.pos.x, t.pos.y));
      obj.getObjectByName("head")!.rotation.y = toYaw(t.rot);
    },
  });
}
