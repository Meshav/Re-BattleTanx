import * as THREE from "three";
import type { Pickup, PickupKind, World } from "@re-tanx/sim";
import { toThree } from "../scene.ts";
import { syncById } from "./syncById.ts";

export const PICKUP_STYLE: Record<PickupKind, { color: number; label: string }> = {
  health: { color: 0x44c767, label: "+" }, shield: { color: 0x4aa3ff, label: "S" }, ammo: { color: 0xc9c9c9, label: "A" },
  guided: { color: 0xff5a36, label: "G" }, swarm: { color: 0xffc24a, label: "W" }, mine: { color: 0x7a8a3a, label: "M" },
  nuke: { color: 0xff2a2a, label: "☢" }, star: { color: 0xffe14a, label: "★" }, loot: { color: 0xb06cff, label: "?" }, bucks: { color: 0x8fe08a, label: "$" },
  laser: { color: 0x6fd6ff, label: "L" }, plasma: { color: 0x9b6bff, label: "P" }, turret: { color: 0xa0a0a0, label: "T" },
  shock: { color: 0xffa64a, label: "K" }, cloak: { color: 0x5a5a6a, label: "C" }, speed: { color: 0x4affd2, label: "»" },
  teleport: { color: 0xc07aff, label: "J" }, repair: { color: 0x7bd389, label: "R" }, edge: { color: 0xffffff, label: "E" },
};

const geo = new THREE.BoxGeometry(2, 2, 2);
const textures = new Map<string, THREE.Texture>();

function labelTexture(text: string, color: number): THREE.Texture {
  const key = `${text}${color}`;
  const cached = textures.get(key);
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "#111";
  g.font = "bold 44px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 32, 35);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  textures.set(key, tex);
  return tex;
}

const styleOf = (p: Pickup) => (p.kind === "loot" && p.special ? PICKUP_STYLE[p.special] : PICKUP_STYLE[p.kind]);

/** Floating, spinning crates. Inactive (respawning) ones are hidden. */
export function syncPickups(meshes: Map<number, THREE.Object3D>, world: World, parent: THREE.Object3D): void {
  const t = performance.now() / 1000;
  syncById(meshes, world.pickups, parent, {
    create: (p) => new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: labelTexture(styleOf(p).label, styleOf(p).color) })),
    update: (obj, p) => {
      const mat = (obj as THREE.Mesh).material as THREE.MeshBasicMaterial;
      const want = labelTexture(styleOf(p).label, styleOf(p).color);
      if (mat.map !== want) mat.map = want; // random spots re-roll their kind on respawn
      obj.visible = p.active;
      obj.position.copy(toThree(p.pos.x, p.pos.y, 2 + Math.sin(t * 2 + p.id) * 0.4));
      obj.rotation.y = t * 1.2 + p.id;
    },
  });
}
