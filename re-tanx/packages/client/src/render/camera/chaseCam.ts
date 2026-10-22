import * as THREE from "three";
import type { Pose } from "../views/tankView.ts";
import { toThree } from "../scene.ts";

export type CamMode = "chase" | "cockpit" | "tactical";

/** V / Back cycles through these. */
export const CAM_MODES: CamMode[] = ["chase", "cockpit", "tactical"];

export interface ChaseCam { mode: CamMode; yaw: number; pos: THREE.Vector3; look: THREE.Vector3 }

export const createChaseCam = (): ChaseCam => ({ mode: "chase", yaw: 0, pos: new THREE.Vector3(), look: new THREE.Vector3() });

/** back / height of the camera, how far ahead it looks and at what height, and how fast it follows */
const RIG: Record<CamMode, { back: number; up: number; ahead: number; lookUp: number; follow: number }> = {
  chase: { back: 13, up: 17, ahead: 8, lookUp: 1, follow: 6 },
  // just behind and above the turret hatch, looking down the hull: near first-person
  cockpit: { back: 0.5, up: 1.7, ahead: 30, lookUp: 0.6, follow: 14 }, // × tank radius
  tactical: { back: 24, up: 50, ahead: 8, lookUp: 1, follow: 6 },
};

/** Smoothed follow. Chase sits behind the hull, cockpit rides on the turret, tactical looks down from high and south. */
/** `size` is the followed tank's radius; only the cockpit rig scales with it. */
export function updateChaseCam(c: ChaseCam, cam: THREE.PerspectiveCamera, pose: Pose, dt: number, shake: { x: number; y: number }, size = 2.4): void {
  const s = c.mode === "cockpit" ? size : 1;
  const r = RIG[c.mode];
  const rig = { ...r, back: r.back * s, up: r.up * s, lookUp: r.lookUp * s };
  const k = 1 - Math.exp(-dt * rig.follow);
  c.yaw += angleDelta(c.yaw, c.mode === "tactical" ? -Math.PI / 2 : pose.rot) * k;
  // cockpit follows the hull's yaw (not the turret) so mouse aim doesn't feed back into the camera
  const target = toThree(pose.x - Math.cos(c.yaw) * rig.back, pose.y - Math.sin(c.yaw) * rig.back, rig.up);
  const look = toThree(pose.x + Math.cos(c.yaw) * rig.ahead, pose.y + Math.sin(c.yaw) * rig.ahead, rig.lookUp);
  const snap = c.pos.lengthSq() === 0 || c.pos.distanceTo(target) > 80 || c.mode === "cockpit"; // cut, don't swoop; cockpit is bolted to the tank
  c.pos.lerp(target, snap ? 1 : k);
  c.look.lerp(look, snap ? 1 : k);
  cam.position.set(c.pos.x + shake.x, c.pos.y + shake.y, c.pos.z);
  cam.lookAt(c.look);
}

function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
