import * as THREE from 'three';

const BACK = 18;
const UP = 10;
const SMOOTHING = 6; // higher = tighter follow

const goal = new THREE.Vector3();

/** Sit behind and above the target, smoothed; look at the target (doc 02 §2.3). */
export function followChase(camera: THREE.Camera, target: THREE.Object3D, dt: number): void {
  goal.set(-BACK, UP, 0).applyQuaternion(target.quaternion).add(target.position);
  camera.position.lerp(goal, 1 - Math.exp(-SMOOTHING * dt));
  camera.lookAt(target.position.x, target.position.y + 2, target.position.z);
}
