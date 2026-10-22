import * as THREE from "three";
import type { Vec2, World } from "@re-tanx/sim";
import { toThree } from "../scene.ts";

const REACH = 0xffd34a;
const EXTRACT = 0x7bd389;

function beacon(p: Vec2, color: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 30, 20, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
  );
  m.position.copy(toThree(p.x, p.y, 15));
  return m;
}

/** Campaign waypoints: light columns over reach points (gold) and extraction (green). */
export function createBeacons(world: World): THREE.Object3D {
  const g = new THREE.Group();
  if (!world.campaign) return g;
  for (const p of world.map.reach) g.add(beacon(p, REACH));
  for (const p of world.map.extraction) g.add(beacon(p, EXTRACT));
  return g;
}

export const BEACON_CSS = { reach: "#ffd34a", extract: "#7bd389" };
