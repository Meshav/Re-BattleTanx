import * as THREE from "three";
import { tankDefs, type Tank } from "@re-tanx/sim";
import { toThree, toYaw } from "../scene.ts";
import { decorate, hasTreads } from "./tankModels.ts";
import { teamColor } from "../teamColors.ts";


export interface TankView { kind: string; root: THREE.Group; body: THREE.Group; turret: THREE.Group; hullMat: THREE.MeshStandardMaterial; shield: THREE.Mesh; mats: THREE.Material[] }

const shieldMat = new THREE.MeshBasicMaterial({ color: 0x6fc3ff, transparent: true, opacity: 0.22, depthWrite: false });

const box = (w: number, h: number, d: number, mat: THREE.Material) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  return m;
};

export function createTankView(tank: Tank): TankView {
  const r = tankDefs[tank.kind].radius;
  const hullMat = new THREE.MeshStandardMaterial({ color: teamColor(tank.team), roughness: 0.7, flatShading: true, transparent: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x22221f, roughness: 0.9, transparent: true });
  const root = new THREE.Group();
  const body = new THREE.Group();
  const hull = box(r * 2.1, r * 0.55, r * 1.5, hullMat);
  hull.position.y = r * 0.45;
  body.add(hull);
  if (hasTreads(tank.kind)) {
    const treadL = box(r * 2.2, r * 0.45, r * 0.35, dark);
    const treadR = treadL.clone();
    treadL.position.set(0, r * 0.25, r * 0.75);
    treadR.position.set(0, r * 0.25, -r * 0.75);
    body.add(treadL, treadR);
  }
  const turret = new THREE.Group();
  turret.position.y = r * 0.85;
  turret.add(box(r * 0.95, r * 0.4, r * 0.85, hullMat));
  decorate(tank.kind, r, body, turret, hullMat);
  const shield = new THREE.Mesh(new THREE.SphereGeometry(r * 1.5, 16, 10), shieldMat);
  shield.position.y = r * 0.5;
  body.add(turret);
  root.add(body, shield);
  return { kind: tank.kind, root, body, turret, hullMat, shield, mats: [hullMat, dark] };
}

export interface Pose { x: number; y: number; rot: number; turretRot: number }

export function updateTankView(v: TankView, tank: Tank, pose: Pose): void {
  v.root.visible = tank.alive;
  const t = performance.now() / 1000;
  const float = tank.kind === "hover" ? 0.5 + Math.sin(t * 3 + tank.id) * 0.15 : 0;
  const shake = tank.fx.stun > 0 ? Math.sin(t * 60) * 0.15 : 0;
  v.root.position.copy(toThree(pose.x + shake, pose.y, float));
  v.root.rotation.y = toYaw(pose.rot);
  v.turret.rotation.y = toYaw(pose.turretRot - pose.rot);
  v.shield.visible = tank.shield > 0;
  const hurt = 1 - tank.hp / tankDefs[tank.kind].hp;
  const burning = tank.fx.burn > 0 ? 0.4 + Math.sin(t * 20) * 0.2 : 0;
  v.hullMat.emissive.setRGB(Math.max(hurt > 0.7 ? 0.25 : 0, burning), burning * 0.4, tank.fx.stun > 0 ? 0.5 : 0);
}

/** Cloaked tanks: teammates see a ghost, enemies see nothing beyond reveal range. */
export function applyCloak(v: TankView, tank: Tank, viewer: Tank, revealRange: number): void {
  const cloaked = tank.fx.cloak > 0;
  const near = Math.hypot(tank.pos.x - viewer.pos.x, tank.pos.y - viewer.pos.y) <= revealRange;
  const opacity = !cloaked ? 1 : tank.team === viewer.team ? 0.35 : near ? 0.2 : 0;
  for (const m of v.mats) m.opacity = opacity;
  v.body.visible = opacity > 0 && tank.alive;
}
