import * as THREE from "three";
import type { Vec2 } from "@re-tanx/sim";
import type { Mouse } from "./input/mouse.ts";
import type { Rect } from "./render/viewports.ts";

const ray = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.5);
const hit = new THREE.Vector3();

/** Where the mouse points on the battlefield (through this viewport's camera), in sim coordinates. */
export function mouseGroundPoint(mouse: Mouse, camera: THREE.Camera, vp: Rect): Vec2 | undefined {
  const ndc = new THREE.Vector2(((mouse.px - vp.x) / vp.w) * 2 - 1, -((mouse.py - vp.y) / vp.h) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, y: hit.z } : undefined;
}
