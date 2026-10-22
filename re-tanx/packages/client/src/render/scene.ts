import * as THREE from "three";
import { settings } from "../settings/settings.ts";

/** One renderer for the page; each match builds a fresh scene. */
export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const low = settings().quality === "low";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: "high-performance" });
  renderer.setPixelRatio(low ? 1 : Math.min(1.5, window.devicePixelRatio));
  renderer.shadowMap.enabled = !low;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const resize = () => renderer.setSize(window.innerWidth, window.innerHeight, false);
  window.addEventListener("resize", resize);
  resize();
  return renderer;
}

/** fog 0..1 pulls the fog in (campaign weather); 0 = the normal haze. */
export function createBattleScene(fog = 0): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8a8f86);
  scene.fog = new THREE.Fog(0x8a8f86, 90 - fog * 75, 220 - fog * 170);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a3328, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(40, 120, 60);
  sun.target.position.set(100, 0, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.4;
  Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, far: 400 });
  scene.add(sun, sun.target);
  return scene;
}

/** Sim plane (x, y) → Three (x, h, y). Sim angle → Three yaw. */
export const toThree = (x: number, y: number, h = 0): THREE.Vector3 => new THREE.Vector3(x, h, y);
export const toYaw = (rot: number): number => -rot;

/** Matches own their GPU allocations; release them before opening another arena. */
export function disposeScene(scene: THREE.Scene): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
      geometries.add(obj.geometry);
      for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) materials.add(mat);
    }
    if (obj instanceof THREE.InstancedMesh) obj.dispose();
    if (obj instanceof THREE.DirectionalLight) obj.shadow.dispose();
  });
  for (const geo of geometries) geo.dispose();
  for (const mat of materials) mat.dispose();
}
