import type { Tank } from '@re-tanx/sim';
import * as THREE from 'three';
import type { Pose } from '../../loop';

/** Owns the Three objects for one tank. Reads sim state; never writes it. */
export interface TankView {
  object: THREE.Object3D;
  update(tank: Tank, prev: Pose, alpha: number): void;
}

export function createTankView(): TankView {
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(6, 2, 3), // sim +x is forward
    new THREE.MeshLambertMaterial({ color: 0x8899aa }),
  );
  hull.position.y = 1;
  const turret = new THREE.Mesh(
    new THREE.BoxGeometry(3, 1, 2),
    new THREE.MeshLambertMaterial({ color: 0x667788 }),
  );
  turret.position.set(0.5, 2.5, 0);
  const barrel = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.4, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x445566 }),
  );
  barrel.position.set(3.5, 2.5, 0);

  const object = new THREE.Group();
  object.add(hull, turret, barrel);

  return {
    object,
    update(tank, prev, alpha) {
      // sim is (x, y) on the ground; Three is y-up, so sim y → -z.
      object.position.x = lerp(prev.x, tank.x, alpha);
      object.position.z = -lerp(prev.y, tank.y, alpha);
      object.rotation.y = lerp(prev.heading, tank.heading, alpha);
    },
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
