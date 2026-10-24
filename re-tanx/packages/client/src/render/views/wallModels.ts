import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Code-made destructible brick wall, one geometry per stage (doc 14 §6: inside the 10 × 10 m cell, 3 m tall,
 * damaged ≈ 55% and holed, rubble under 1 m). Origin at the cell centre on the ground; vertex colours.
 */
const BRICK = [0x9a4f3a, 0x86442f, 0xa65a40];
const MORTAR = 0x6d655a, CAP = 0xb3ab9e, FOOT = 0x5f5a52, SCORCH = 0x3f3430, DUST = 0x6b6359;
const HALF = 4.7; // brick face sits just inside the cell edge

function block(parts: THREE.BufferGeometry[], w: number, h: number, d: number, x: number, y: number, z: number, hex: number, rotY = 0): void {
  const g = new THREE.BoxGeometry(w, h, d).rotateY(rotY).translate(x, y + h / 2, z);
  const c = new THREE.Color(hex);
  const n = g.getAttribute("position").count;
  g.setAttribute("color", new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, i) => (i % 3 === 0 ? c.r : i % 3 === 1 ? c.g : c.b)), 3));
  parts.push(g);
}

/** Deterministic, so every wall of a stage shares one geometry. */
function rng(seed: number): () => number {
  let s = seed;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

/** One course of bricks around the four faces, staggered every other course; `skip` knocks bricks out. */
function course(parts: THREE.BufferGeometry[], y: number, h: number, row: number, skip: (i: number) => boolean): void {
  const n = 4, len = (HALF * 2) / n;
  // odd courses start and end with half bricks
  const edges = row % 2 ? [-HALF, ...Array.from({ length: n }, (_, i) => -HALF + len / 2 + i * len), HALF] : Array.from({ length: n + 1 }, (_, i) => -HALF + i * len);
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i + 1 < edges.length; i++) {
      if (skip(side * edges.length + i)) continue;
      const along = (edges[i]! + edges[i + 1]!) / 2, w = edges[i + 1]! - edges[i]! - 0.12;
      const rot = (side * Math.PI) / 2;
      const x = Math.cos(rot) * HALF - Math.sin(rot) * along, z = Math.sin(rot) * HALF + Math.cos(rot) * along;
      block(parts, 0.3, h - 0.08, w, x, y, z, BRICK[(side + i + row) % BRICK.length]!, -rot);
    }
  }
}

function intact(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  block(parts, 9.8, 0.4, 9.8, 0, 0, 0, FOOT);
  block(parts, 9.2, 2.3, 9.2, 0, 0.4, 0, MORTAR);
  for (let row = 0; row < 3; row++) course(parts, 0.4 + row * 0.77, 0.77, row, () => false);
  block(parts, 9.9, 0.3, 9.9, 0, 2.7, 0, CAP);
  return mergeGeometries(parts)!;
}

function damaged(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const r = rng(7);
  block(parts, 9.8, 0.4, 9.8, 0, 0, 0, FOOT);
  block(parts, 9.2, 0.9, 9.2, 0, 0.4, 0, SCORCH);
  course(parts, 0.4, 0.77, 0, (i) => i % 5 === 2); // holes in the bottom course
  // jagged top: broken stubs of the upper courses
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + r() * 0.3, h = 0.3 + r() * 0.6;
    block(parts, 1.3 + r(), h, 0.6 + r() * 0.5, Math.cos(a) * 4.1, 1.17, Math.sin(a) * 4.1, r() < 0.3 ? SCORCH : BRICK[k % 3]!, -a);
  }
  for (let k = 0; k < 4; k++) block(parts, 0.9, 0.45, 0.7, -3 + k * 2, 1.17, 3.6, BRICK[k % 3]!, r() * 1.5); // loose bricks on the ledge
  return mergeGeometries(parts)!;
}

function rubble(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const r = rng(11);
  block(parts, 9.2, 0.25, 9.2, 0, 0, 0, DUST);
  for (let k = 0; k < 16; k++) {
    const x = (r() - 0.5) * 8, z = (r() - 0.5) * 8;
    block(parts, 0.6 + r() * 0.9, 0.25 + r() * 0.45, 0.5 + r() * 0.7, x, 0.2, z, [...BRICK, CAP, SCORCH][k % 5]!, r() * Math.PI);
  }
  return mergeGeometries(parts)!;
}

let cache: THREE.BufferGeometry[] | undefined;
/** [intact, damaged, rubble] */
export const wallGeometries = (): THREE.BufferGeometry[] => (cache ??= [intact(), damaged(), rubble()]);
