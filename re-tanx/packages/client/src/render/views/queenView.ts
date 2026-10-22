import * as THREE from "three";
import type { World } from "@re-tanx/sim";
import { toThree } from "../scene.ts";
import { syncById } from "./syncById.ts";
import { teamColor } from "../teamColors.ts";

const robe = new THREE.ConeGeometry(0.9, 2.4, 10);
const head = new THREE.SphereGeometry(0.45, 10, 8);
const crown = new THREE.CylinderGeometry(0.5, 0.4, 0.35, 6);
const ringGeo = new THREE.TorusGeometry(1.5, 0.12, 6, 24).rotateX(Math.PI / 2);
const gold = new THREE.MeshStandardMaterial({ color: 0xffd34a, emissive: 0x6a4a00, metalness: 0.4 });
const neutral = 0xd86bff;

function build(team: number): THREE.Object3D {
  const color = team < 0 ? neutral : teamColor(team);
  const g = new THREE.Group();
  const body = new THREE.Mesh(robe, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 }));
  body.position.y = 1.2;
  const h = new THREE.Mesh(head, new THREE.MeshStandardMaterial({ color: 0xf1d1b5 }));
  h.position.y = 2.7;
  const c = new THREE.Mesh(crown, gold);
  c.position.y = 3.15;
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color }));
  ring.position.y = 0.15;
  ring.name = "ring";
  g.add(body, h, c, ring);
  g.traverse((o) => (o.castShadow = true));
  return g;
}

/** QueenLords: robed figure in her team colour; rides high on her carrier, spins slowly when captive. */
export function syncQueens(objs: Map<number, THREE.Object3D>, world: World, parent: THREE.Object3D): void {
  const t = performance.now() / 1000;
  syncById(objs, world.queens, parent, {
    create: (q) => build(q.team),
    update: (obj, q) => {
      const lift = q.state === "carried" ? 3.2 : 0;
      obj.position.copy(toThree(q.pos.x, q.pos.y, lift + (q.state === "dropped" ? Math.abs(Math.sin(t * 4)) * 0.6 : 0)));
      obj.rotation.y = q.state === "held" ? t : 0;
      obj.getObjectByName("ring")!.visible = q.state !== "carried";
    },
  });
}
