import * as THREE from 'three';

export interface Scene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  render(): void;
}

export function createScene(): Scene {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202830);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334433, 1.2));
  scene.add(groundPlane(), new THREE.GridHelper(200, 20, 0x446644, 0x335533));

  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  return { scene, camera, render: () => renderer.render(scene, camera) };
}

function groundPlane(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshLambertMaterial({ color: 0x3a4a3a }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}
