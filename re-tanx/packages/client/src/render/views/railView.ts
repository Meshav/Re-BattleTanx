import * as THREE from "three";
import type { World } from "@re-tanx/sim";
import { toThree } from "../scene.ts";
import { teamColor } from "../teamColors.ts";

const steel = new THREE.MeshStandardMaterial({ color: 0x6b6f75, metalness: 0.6, roughness: 0.5 });

/** Battlelord rail Goliaths: twin rails plus an empty gun car parked mid-track (hidden while someone rides). */
export function createRails(world: World): { root: THREE.Group; cars: THREE.Object3D[] } {
  const root = new THREE.Group();
  const cars = world.rails.map((r) => {
    const len = Math.hypot(r.b.x - r.a.x, r.b.y - r.a.y);
    const yaw = -Math.atan2(r.b.y - r.a.y, r.b.x - r.a.x);
    const mid = { x: (r.a.x + r.b.x) / 2, y: (r.a.y + r.b.y) / 2 };
    for (const side of [-1.4, 1.4]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len + 4, 0.3, 0.3), steel);
      rail.position.copy(toThree(mid.x - Math.sin(-yaw) * side, mid.y + Math.cos(-yaw) * side, 0.15));
      rail.rotation.y = yaw;
      root.add(rail);
    }
    const car = new THREE.Group();
    const color = teamColor(r.team);
    car.add(new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 4), new THREE.MeshStandardMaterial({ color, roughness: 0.7 })));
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5).rotateZ(Math.PI / 2), steel);
    gun.position.set(2, 1.2, 0);
    car.add(gun);
    car.position.copy(toThree(mid.x, mid.y, 0.4));
    car.rotation.y = yaw;
    root.add(car);
    return car;
  });
  return { root, cars };
}

export function updateRails(rails: { cars: THREE.Object3D[] }, world: World): void {
  world.rails.forEach((r, i) => {
    const car = rails.cars[i];
    if (car) car.visible = r.riderId === undefined;
  });
}
