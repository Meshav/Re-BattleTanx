import { expect, it } from "vitest";
import * as THREE from "three";
import { createWorld, parseMap } from "@re-tanx/sim";
import { createStructureViews, fadeOccluders, syncStructures } from "./structureView.ts";

it("batches buildings, restores them for each viewport, and keeps destruction in sync", () => {
  const world = createWorld(parseMap({ id: "test", name: "test", cell: 10, rows: ["S#..", "..#."] }), []);
  const root = new THREE.Group();
  const view = createStructureViews(world, root);
  expect(root.children).toHaveLength(2);
  expect(view.solid.count).toBe(world.structures.length);
  const cam = new THREE.PerspectiveCamera();
  cam.position.set(15, 5, -10);
  fadeOccluders(view, cam, new THREE.Vector3(15, 1, 20));
  expect(view.faded.count).toBe(1);
  const matrix = new THREE.Matrix4();
  view.solid.getMatrixAt(0, matrix);
  expect(matrix.elements[0]).toBe(0);
  cam.position.set(5, 5, -10);
  fadeOccluders(view, cam, new THREE.Vector3(5, 1, 20));
  expect(view.faded.count).toBe(0);
  view.solid.getMatrixAt(0, matrix);
  expect(matrix.elements[0]).toBeGreaterThan(0);
  world.structures[0]!.stage = 2;
  syncStructures(view, world);
  view.solid.getMatrixAt(0, matrix);
  expect(matrix.elements[5]).toBeCloseTo(0.8);
  expect(view.bounds[0]!.max.y).toBe(0.8);
});
