import * as THREE from "three";
import type { TankKind } from "@re-tanx/sim";

const dark = new THREE.MeshStandardMaterial({ color: 0x22221f, roughness: 0.9 });
const metal = new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: 0.5, metalness: 0.5 });
const glow = new THREE.MeshBasicMaterial({ color: 0x6fd6ff });

export const part = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const tube = (r: number, len: number) => new THREE.CylinderGeometry(r, r * 1.1, len, 10).rotateZ(Math.PI / 2);

/** Per-kind silhouettes so a tank reads at a glance: hull extras + gun on the turret. All sizes in radii. */
export function decorate(kind: TankKind, r: number, hull: THREE.Group, turret: THREE.Group, paint: THREE.Material): void {
  const extras: Record<TankKind, () => void> = {
    moto: () => turret.add(part(tube(r * 0.07, r * 1.1), dark, r * 0.8, 0, r * 0.15), part(tube(r * 0.07, r * 1.1), dark, r * 0.8, 0, -r * 0.15)),
    m1: () => turret.add(part(tube(r * 0.1, r * 1.3), dark, r * 0.95)),
    goliath: () => turret.add(part(tube(r * 0.15, r * 1.4), dark, r * 1.0), part(box(r * 0.5, r * 0.25, r * 1.0), paint, -r * 0.3, r * 0.25)),
    hover: () => {
      hull.add(part(new THREE.CylinderGeometry(r * 0.9, r * 1.0, r * 0.12, 16), glow, 0, r * 0.05));
      turret.add(part(tube(r * 0.08, r * 1.3), dark, r * 0.95));
    },
    inferno: () => {
      hull.add(part(new THREE.CylinderGeometry(r * 0.22, r * 0.22, r * 1.2, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xb8401f }), -r * 0.75, r * 0.85));
      turret.add(part(new THREE.ConeGeometry(r * 0.18, r * 0.9, 10).rotateZ(-Math.PI / 2), dark, r * 0.9));
    },
    rattler: () => turret.add(part(box(r * 0.8, r * 0.35, r * 0.35), metal, r * 0.4, r * 0.1, r * 0.45), part(box(r * 0.8, r * 0.35, r * 0.35), metal, r * 0.4, r * 0.1, -r * 0.45)),
    rhino: () => {
      hull.add(part(new THREE.CylinderGeometry(r * 0.1, r * 0.1, r * 1.9, 3).rotateX(Math.PI / 2), metal, r * 1.15, r * 0.35));
      turret.add(part(tube(r * 0.13, r * 1.2), dark, r * 0.9));
    },
    flpe: () => {
      turret.add(part(tube(r * 0.05, r * 1.4), metal, r * 1.0));
      turret.add(part(new THREE.CylinderGeometry(r * 0.45, r * 0.2, r * 0.12, 16).rotateZ(Math.PI / 2), glow, -r * 0.2, r * 0.45));
    },
    truck: () => {
      // armoured hauler: cab up front, cargo box behind; the turret is just a roof hatch
      hull.add(part(box(r * 0.7, r * 0.8, r * 1.1), paint, r * 0.6, r * 0.55), part(box(r * 1.3, r * 0.95, r * 1.2), new THREE.MeshStandardMaterial({ color: 0x8a7a55, roughness: 0.9 }), -r * 0.45, r * 0.65));
      turret.visible = false;
    },
    warlord: () => {
      hull.add(part(box(r * 0.5, r * 0.5, r * 1.6), metal, -r * 0.9, r * 0.75), part(box(r * 0.25, r * 0.6, r * 0.25), new THREE.MeshBasicMaterial({ color: 0xff5a2a }), -r * 1.15, r * 0.8));
      turret.add(part(tube(r * 0.12, r * 1.3), dark, r * 0.9, 0, r * 0.22), part(tube(r * 0.12, r * 1.3), dark, r * 0.9, 0, -r * 0.22));
      turret.add(part(box(r * 0.5, r * 0.5, r * 0.5), metal, 0, r * 0.4));
    },
    sentinel: () => {
      const mortar = part(new THREE.CylinderGeometry(r * 0.22, r * 0.26, r * 1.1, 10), dark, r * 0.35, r * 0.35);
      mortar.rotation.z = -Math.PI / 4;
      turret.add(mortar);
    },
  };
  extras[kind]();
}

/** Hover tanks float, so no treads. */
export const hasTreads = (kind: TankKind): boolean => kind !== "hover";
