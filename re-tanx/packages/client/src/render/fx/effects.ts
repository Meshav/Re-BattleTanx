import * as THREE from "three";
import type { SimEvent, World } from "@re-tanx/sim";
import { toThree } from "../scene.ts";

interface Fx { obj: THREE.Mesh | THREE.Line; age: number; life: number; grow: number }

const flashGeo = new THREE.SphereGeometry(1, 10, 8);

/** Short-lived explosion balls and tracer lines, spawned from sim events. */
export interface Effects { list: Fx[]; parent: THREE.Object3D }

export function createEffects(parent: THREE.Object3D): Effects {
  return { list: [], parent };
}

export function spawnFromEvents(fx: Effects, events: SimEvent[], world: World): void {
  for (const e of events) {
    if (e.type === "explode") ball(fx, e.pos.x, e.pos.y, Math.max(1.2, e.radius), e.radius > 2 ? 0xff7a2a : 0xffd27a);
    if (e.type === "fire" && (e.weapon === "hitscan" || e.weapon === "laser" || e.weapon === "turret")) tracer(fx, world, e, BEAM[e.weapon] ?? 0xffe9a0);
    if (e.type === "fire" && e.weapon === "flame") flame(fx, e.pos, e.rot);
    if (e.type === "fire" && e.weapon === "shell") ball(fx, e.pos.x, e.pos.y, 0.8, 0xfff2b0);
    if (e.type === "nukeDetonate") ball(fx, e.pos.x, e.pos.y, 60, 0xfff6d0);
    if (e.type === "pickup") ball(fx, e.pos.x, e.pos.y, 2.5, 0xffffff);
    if (e.type === "queen" && e.what === "captured") ball(fx, e.pos.x, e.pos.y, 8, 0xffd34a);
  }
}

function ball(fx: Effects, x: number, y: number, r: number, color: number): void {
  const m = new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  m.position.copy(toThree(x, y, 1.5));
  m.scale.setScalar(r * 0.3);
  fx.parent.add(m);
  fx.list.push({ obj: m, age: 0, life: 0.35 + r * 0.04, grow: r });
}

const BEAM: Record<string, number> = { hitscan: 0xffe9a0, laser: 0x6fd6ff, turret: 0xffc070 };

function tracer(fx: Effects, world: World, e: Extract<SimEvent, { type: "fire" }>, color: number): void {
  const t = e.weapon === "turret" ? world.turrets.find((k) => k.ownerId === e.tankId) : world.tanks.find((k) => k.id === e.tankId);
  if (!t) return;
  const geo = new THREE.BufferGeometry().setFromPoints([toThree(t.pos.x, t.pos.y, 1.6), toThree(e.pos.x, e.pos.y, 1.6)]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true }));
  fx.parent.add(line);
  fx.list.push({ obj: line, age: 0, life: e.weapon === "laser" ? 0.12 : 0.06, grow: 0 });
}

const flameGeo = new THREE.ConeGeometry(2.2, 11, 10, 1, true).rotateZ(Math.PI / 2).translate(-5.5, 0, 0);

/** Brief orange cone along the turret. */
function flame(fx: Effects, at: { x: number; y: number }, rot: number): void {
  const m = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
  m.position.copy(toThree(at.x + Math.cos(rot) * 13, at.y + Math.sin(rot) * 13, 1.6));
  m.rotation.y = -rot;
  fx.parent.add(m);
  fx.list.push({ obj: m, age: 0, life: 0.12, grow: 0 });
}

export function updateEffects(fx: Effects, dt: number): void {
  fx.list = fx.list.filter((f) => {
    f.age += dt;
    const k = f.age / f.life;
    const mat = f.obj.material as THREE.Material;
    mat.opacity = Math.max(0, 1 - k);
    if (f.grow) f.obj.scale.setScalar(f.grow * (0.3 + 0.9 * k));
    if (k < 1) return true;
    fx.parent.remove(f.obj);
    if (f.obj.geometry !== flashGeo && f.obj.geometry !== flameGeo) f.obj.geometry.dispose();
    mat.dispose();
    return false;
  });
}
