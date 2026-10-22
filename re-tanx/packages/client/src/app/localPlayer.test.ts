import { afterEach, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createWorld, parseMap } from "@re-tanx/sim";
import { peekInput, readInput, type Devices, type LocalPlayer } from "./localPlayer.ts";

// Rendering must never consume the input that the next recorded/server tick needs.
afterEach(() => vi.unstubAllGlobals());
it("preview reads preserve action taps and a released fire key does not stick", () => {
  vi.stubGlobal("localStorage", { getItem: () => null });
  const world = createWorld(parseMap({ id: "test", name: "test", cell: 10, rows: ["S..."] }), [{ team: 0, kind: "m1" }]);
  const p = { device: "kbm", tank: world.tanks[0]!, camera: new THREE.PerspectiveCamera(), rect: { x: 0, y: 0, w: 100, h: 100 } } as LocalPlayer;
  const d: Devices = {
    kb: { held: new Set(["Space"]), pressed: new Set(["Space", "KeyE"]) },
    mouse: { px: 50, py: 50, ndcX: 0, ndcY: 0, left: false, right: false, clickedL: true, clickedR: false, moved: false },
  };
  expect(peekInput(p, d, world)).toMatchObject({ fire: true, cycle: 1 });
  expect(peekInput(p, d, world)).toMatchObject({ fire: true, cycle: 1 });
  expect(d.mouse.clickedL).toBe(true);
  expect(d.kb.pressed.has("KeyE")).toBe(true);
  expect(readInput(p, d, world)).toMatchObject({ fire: true, cycle: 1 });
  d.kb.held.clear();
  expect(readInput(p, d, world)).toMatchObject({ fire: false, cycle: 0 });
});
