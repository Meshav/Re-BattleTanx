import * as THREE from "three";
import type { Pickup, PickupKind, World } from "@re-tanx/sim";
import { toThree } from "../scene.ts";
import { syncById } from "./syncById.ts";
import { drawPickupFace } from "./pickupIcons.ts";

export const PICKUP_STYLE: Record<PickupKind, { color: number }> = {
  health: { color: 0x44c767 }, shield: { color: 0x4aa3ff }, ammo: { color: 0x9a9a9a },
  guided: { color: 0xff5a36 }, swarm: { color: 0xe0a02a }, mine: { color: 0x7a8a3a },
  nuke: { color: 0xe02a2a }, star: { color: 0xf0c814 }, loot: { color: 0xb06cff }, bucks: { color: 0x4f9a4a },
  laser: { color: 0x3fa6d6 }, plasma: { color: 0x9b6bff }, turret: { color: 0x6f7378 },
  shock: { color: 0xff8a2a }, cloak: { color: 0x5a5a6a }, speed: { color: 0x1fbf9a },
  teleport: { color: 0xc07aff }, repair: { color: 0x3f9a5a }, edge: { color: 0x8a6cff },
};

const geo = new THREE.BoxGeometry(2, 2, 2);
const textures = new Map<PickupKind, THREE.Texture>();

function faceTexture(kind: PickupKind): THREE.Texture {
  const cached = textures.get(kind);
  if (cached) return cached;
  const c = document.createElement("canvas");
  drawPickupFace(c, kind, PICKUP_STYLE[kind].color);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4; // faces are seen edge-on while the crate spins
  textures.set(kind, tex);
  return tex;
}

/** Dropped loot shows the special it holds. */
const iconOf = (p: Pickup): PickupKind => (p.kind === "loot" && p.special ? p.special : p.kind);

/** Floating, spinning crates. Inactive (respawning) ones are hidden. */
export function syncPickups(meshes: Map<number, THREE.Object3D>, world: World, parent: THREE.Object3D): void {
  const t = performance.now() / 1000;
  syncById(meshes, world.pickups, parent, {
    create: (p) => new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: faceTexture(iconOf(p)) })),
    update: (obj, p) => {
      const mat = (obj as THREE.Mesh).material as THREE.MeshBasicMaterial;
      const want = faceTexture(iconOf(p));
      if (mat.map !== want) mat.map = want; // random spots re-roll their kind on respawn
      obj.visible = p.active;
      obj.position.copy(toThree(p.pos.x, p.pos.y, 2 + Math.sin(t * 2 + p.id) * 0.4));
      obj.rotation.y = t * 1.2 + p.id;
    },
  });
}
