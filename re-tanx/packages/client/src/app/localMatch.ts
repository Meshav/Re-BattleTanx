import { createRecorder, createWorld, parseMap, quantizeInput, rules, stepWorld, tankDefs, type Playback, type Recorder, type Replay, type SimEvent, type World } from "@re-tanx/sim";
import type * as THREE from "three";
import { createBattleScene, disposeScene, toThree } from "../render/scene.ts";
import { capturePoses, createWorldView, fadeFor, onSimEvents, renderWorld, syncViewerOnly } from "../render/worldView.ts";
import { updateChaseCam } from "../render/camera/chaseCam.ts";
import { addShake, shakeOffset } from "../render/fx/shake.ts";
import { layoutViewports } from "../render/viewports.ts";
import { hudEvents, updateHud } from "../hud/hud.ts";
import { playEvents, playMusic, updateEngine, type Sfx } from "../audio/sfx.ts";
import { startLoop } from "../loop.ts";
import { toSlots, type Device, type MatchConfig } from "./matchConfig.ts";
import { anyPadStart, clearMouseClicks, createLocalPlayer, peekInput, placePlayer, readInput, toggleCamera, wantsCameraToggle, type Devices, type LocalPlayer } from "./localPlayer.ts";
import { playerPose } from "../render/playerPose.ts";
import type { Pose } from "../render/views/tankView.ts";
import { cameraPose } from "./cameraPose.ts";
import { createPauseMenu } from "./pauseMenu.ts";
import { consumePress } from "../input/keyboard.ts";
import { loadProfile } from "./profile/localProfile.ts";
import { createTouch } from "../input/touch.ts";
import { renderRoster } from "../hud/roster.ts";
import { arenaFor, customMap } from "./editor/customMaps.ts";

export interface MatchHooks {
  onOver(world: World, replay?: Replay): void;
  onQuit(): void;
  /** per-frame extra UI for a local player (campaign deploy screen) */
  onPlayerFrame?(p: LocalPlayer, world: World): void;
}

/** Versus match from menu settings. */
export function startLocalMatch(cfg: MatchConfig, renderer: THREE.WebGLRenderer, devices: Devices, sfx: Sfx, hooks: MatchHooks): () => void {
  const map = cfg.map ?? "graybox";
  const slots = toSlots(cfg, loadProfile().perks);
  const opts = {
    seed: (Date.now() & 0xffff) || 1, perks: cfg.perks === true,
    mode: { kind: cfg.mode, ...(cfg.scoreLimit > 0 ? { scoreLimit: cfg.scoreLimit } : {}) },
  };
  const custom = customMap(map);
  const world = createWorld(parseMap(arenaFor(map)), slots, opts);
  const recorder = createRecorder({ map, slots, opts, ...(custom ? { customMap: custom } : {}) }, cfg.players.length);
  return runLocalWorld(world, cfg.players.map((p) => p.device), { renderer, devices, sfx }, { ...hooks, onOver: (w) => hooks.onOver(w, recorder.finish(w)) }, { recorder });
}

export interface RunCtx { renderer: THREE.WebGLRenderer; devices: Devices; sfx: Sfx }

/** recorder: capture human inputs for a replay. playback: drive the world from a replay instead of the devices. */
export interface RunOpts { recorder?: Recorder; playback?: Playback }

const SPEEDS = { Digit1: 1, Digit2: 2, Digit3: 4 } as const;

/** Runs a prepared world for 1–4 split-screen players (tanks 0..n-1) until it ends or the player quits. */
export function runLocalWorld(world: World, deviceList: Device[], ctx: RunCtx, hooks: MatchHooks, opts: RunOpts = {}): () => void {
  const { renderer, devices, sfx } = ctx;
  const scene = createBattleScene(world.campaign?.mission.fog);
  const view = createWorldView(scene, world);
  const hudHost = document.querySelector<HTMLElement>("#hud")!;
  hudHost.innerHTML = "";
  const names = (id: number) => world.tanks.find((t) => t.id === id)?.name ?? "?";
  const players: LocalPlayer[] = deviceList.map((d, i) => createLocalPlayer(world.tanks[i]!, d, hudHost, names));
  if (deviceList.includes("touch")) devices.touch = createTouch(hudHost);
  const shake = { amount: 0 };
  const pause = createPauseMenu(hudHost, { onQuit: () => { stop(); hooks.onQuit(); } });
  let prev = capturePoses(world);
  let overAt = 0;
  let padStartWas = false;
  let speed = 1;
  let stopped = false;
  const banner = opts.playback ? replayBanner(hudHost) : undefined;
  Object.assign(window, { reTanx: { world, me: players[0]?.tank, players } });

  playMusic(sfx, "battle");
  const layout = () => layoutViewports(players.length, window.innerWidth, window.innerHeight).forEach((r, i) => placePlayer(players[i]!, r, players.length > 1));
  layout();
  window.addEventListener("resize", layout);

  const stopLoop = startLoop(1 / rules.tickRate, {
    step() {
      if (pause.open) return clearMouseClicks(devices);
      prev = capturePoses(world);
      const events = tick();
      onSimEvents(view, events, world);
      const p0 = players[0]!.tank;
      addShake(shake, events, p0.pos);
      playEvents(sfx, events, world, p0);
      updateEngine(sfx, p0);
      for (const p of players) hudEvents(p.hud, events, world);
      if ((world.mode.over || opts.playback?.done) && !overAt) overAt = performance.now();
    },
    render(alpha, dt) {
      const start = anyPadStart();
      if (consumePress(devices.kb, "Escape") || (start && !padStartWas)) pause.toggle();
      padStartWas = start;
      if (pause.open) alpha = 1;
      if (opts.playback) replayKeys();
      for (const p of players) if (wantsCameraToggle(p, devices)) toggleCamera(p);
      const poses = opts.playback ? undefined : new Map(players.map((p) => [p.tank.id,
        playerPose(world, p.tank, peekInput(p, devices, world), pause.open ? 0 : alpha)]));
      renderWorld(view, world, prev, alpha, dt, poses);
      const sh = shakeOffset(shake, dt);
      for (const p of players) drawViewport(p, alpha, dt, sh, poses?.get(p.tank.id));
      if (overAt && performance.now() - overAt > 2500) {
        stop();
        hooks.onOver(world);
      }
    },
  });

  function tick(): SimEvent[] {
    const pb = opts.playback;
    if (!pb) {
      for (const p of players) world.inputs[p.tank.id] = quantizeInput(readInput(p, devices, world));
      opts.recorder?.record(world);
      return stepWorld(world);
    }
    const events: SimEvent[] = [];
    for (let k = 0; k < speed && !pb.done; k++) events.push(...pb.step());
    return events;
  }

  function replayKeys(): void {
    for (const [code, s] of Object.entries(SPEEDS)) if (consumePress(devices.kb, code)) speed = s;
    const p = players[0]!;
    if (consumePress(devices.kb, "Tab")) {
      p.tank = world.tanks[(world.tanks.indexOf(p.tank) + 1) % world.tanks.length]!;
      renderRoster(p.hud.roster, p.tank);
    }
    banner!.textContent = `REPLAY · ${speed}× · watching ${p.tank.name} — Tab: next tank · 1/2/3: speed · Esc: menu`;
  }

  function drawViewport(p: LocalPlayer, alpha: number, dt: number, sh: { x: number; y: number }, own?: Pose): void {
    const pose = cameraPose(world, prev, p.tank, alpha, own);
    updateChaseCam(p.cam, p.camera, pose, dt, players.length === 1 ? sh : { x: 0, y: 0 }, tankDefs[p.tank.kind].radius);
    syncViewerOnly(view, world, p.tank);
    fadeFor(view, p.camera, toThree(pose.x, pose.y, 1.5));
    updateHud(p.hud, p.tank, world);
    hooks.onPlayerFrame?.(p, world);
    const H = window.innerHeight;
    renderer.setViewport(p.rect.x, H - p.rect.y - p.rect.h, p.rect.w, p.rect.h);
    renderer.setScissor(p.rect.x, H - p.rect.y - p.rect.h, p.rect.w, p.rect.h);
    renderer.setScissorTest(true);
    renderer.render(scene, p.camera);
  }

  function stop(): void {
    if (stopped) return;
    stopped = true;
    stopLoop();
    updateEngine(sfx, undefined);
    devices.touch?.el.remove();
    delete devices.touch;
    window.removeEventListener("resize", layout);
    renderer.setScissorTest(false);
    disposeScene(scene);
    renderer.renderLists.dispose();
  }
  return stop;
}

function replayBanner(host: HTMLElement): HTMLElement {
  const el = document.createElement("div");
  el.className = "replay-banner";
  host.append(el);
  return el;
}
