import * as THREE from "three";
import type { World } from "@re-tanx/sim";
import { modeDefs, modeRules } from "@re-tanx/sim";
import { toThree } from "../scene.ts";
import { teamColor } from "../teamColors.ts";

/** Team-coloured pads with corner pylons, shown only in modes that use fortresses. */
export function createFortresses(world: World): THREE.Object3D {
  const g = new THREE.Group();
  if (!modeRules[world.mode.kind].usesFortresses) return g;
  const r = modeDefs.queen.fortressRadius;
  world.map.fortresses.forEach((f, team) => {
    const color = teamColor(team);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(r, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.35 }));
    pad.position.copy(toThree(f.x, f.y, 0.05));
    pad.receiveShadow = true;
    g.add(pad);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4, 0.8), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 }));
      pylon.position.copy(toThree(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, 2));
      pylon.castShadow = true;
      g.add(pylon);
    }
  });
  return g;
}
