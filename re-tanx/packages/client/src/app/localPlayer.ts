import * as THREE from "three";
import type { InputState, Tank, World } from "@re-tanx/sim";
import type { Device } from "./matchConfig.ts";
import { CAM_MODES, createChaseCam, type ChaseCam } from "../render/camera/chaseCam.ts";
import { createHud, type Hud } from "../hud/hud.ts";
import type { Rect } from "../render/viewports.ts";
import { consumePress, type Keyboard } from "../input/keyboard.ts";
import { takeButton, type Mouse } from "../input/mouse.ts";
import { readPad, type PadState } from "../input/gamepad.ts";
import { arcadeInput } from "../control/arcade.ts";
import { classicInput, ARROW_KEYS } from "../control/classic.ts";
import { twinStickInput } from "../control/twinStick.ts";
import { touchInput } from "../control/touchStick.ts";
import { takeTap, type Touch } from "../input/touch.ts";
import { mouseGroundPoint } from "../aim.ts";
import { settings } from "../settings/settings.ts";

/** One person on this device: their tank, input source, camera, HUD and screen rect. */
export interface LocalPlayer {
  tank: Tank; device: Device; cam: ChaseCam; camera: THREE.PerspectiveCamera;
  hud: Hud; hudRoot: HTMLElement; rect: Rect; lastPad: PadState | undefined;
}

export function createLocalPlayer(tank: Tank, device: Device, hudHost: HTMLElement, names: (id: number) => string): LocalPlayer {
  const hudRoot = document.createElement("div");
  hudRoot.className = "vp";
  hudHost.appendChild(hudRoot);
  return {
    tank, device, cam: createChaseCam(), camera: new THREE.PerspectiveCamera(60, 1, 0.5, 600),
    hud: createHud(hudRoot, names), hudRoot, rect: { x: 0, y: 0, w: 1, h: 1 }, lastPad: undefined,
  };
}

export function placePlayer(p: LocalPlayer, rect: Rect, split: boolean): void {
  p.rect = rect;
  p.camera.aspect = rect.w / rect.h;
  p.camera.updateProjectionMatrix();
  Object.assign(p.hudRoot.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
  p.hudRoot.classList.toggle("split", split);
}

export interface Devices { kb: Keyboard; mouse: Mouse; touch?: Touch }

/** Read live controls for rendering without consuming taps intended for the next sim tick. */
export function peekInput(p: LocalPlayer, d: Devices, world: World): InputState {
  return readInput(p, {
    kb: { held: d.kb.held, pressed: new Set(d.kb.pressed) }, mouse: { ...d.mouse },
    ...(d.touch ? { touch: { ...d.touch } } : {}),
  }, world, true);
}

export function readInput(p: LocalPlayer, d: Devices, world: World, preview = false): InputState {
  if (p.device === "kbm") {
    d.mouse.moved = false;
    return arcadeInput(d.kb, d.mouse, p.tank, mouseGroundPoint(d.mouse, p.camera, p.rect));
  }
  if (p.device === "keys") return classicInput(d.kb, ARROW_KEYS, p.tank, world);
  if (p.device === "touch") return d.touch ? touchInput(d.touch, p.tank, p.cam.yaw) : classicInput(d.kb, ARROW_KEYS, p.tank, world);
  const pad = readPad(Number(p.device.slice(3)));
  if (!preview && pad.back && !p.lastPad?.back) toggleCamera(p);
  const input = twinStickInput(pad, p.lastPad, p.tank, p.cam.yaw);
  if (!preview) p.lastPad = pad;
  return input;
}

export function toggleCamera(p: LocalPlayer): void {
  p.cam.mode = CAM_MODES[(CAM_MODES.indexOf(p.cam.mode) + 1) % CAM_MODES.length]!;
}

/** Keyboard camera toggles: V (mouse player), "." (arrow player). Pads toggle with Back inside readInput. */
export function wantsCameraToggle(p: LocalPlayer, d: Devices): boolean {
  if (p.device === "kbm") return consumePress(d.kb, settings().bindings.camera);
  if (p.device === "touch") return d.touch !== undefined && takeTap(d.touch, "camera");
  return p.device === "keys" && consumePress(d.kb, "Period");
}

/** Start on any connected pad (edge-detected by the caller). */
export const anyPadStart = (): boolean => Array.from(navigator.getGamepads?.() ?? []).some((pad) => pad?.buttons[9]?.pressed);

export const clearMouseClicks = (d: Devices): void => {
  takeButton(d.mouse, "L");
  takeButton(d.mouse, "R");
};
