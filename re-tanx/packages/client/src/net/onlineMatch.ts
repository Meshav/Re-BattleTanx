import { idleInput, quantizeInput, createWorld, mapById, parseMap, applySnapshot, rules, tankDefs, type MapJson, type ModeKind, type ServerMsg, type World } from "@re-tanx/sim";
import type * as THREE from "three";
import { createBattleScene, disposeScene, toThree } from "../render/scene.ts";
import { capturePoses, createWorldView, fadeFor, onSimEvents, renderWorld, syncViewerOnly, type Poses } from "../render/worldView.ts";
import { playerPose } from "../render/playerPose.ts";
import { updateTankView } from "../render/views/tankView.ts";
import { updateChaseCam } from "../render/camera/chaseCam.ts";
import { addShake, shakeOffset } from "../render/fx/shake.ts";
import { hudEvents, updateHud } from "../hud/hud.ts";
import { playEvents, playMusic, updateEngine, type Sfx } from "../audio/sfx.ts";
import { startLoop } from "../loop.ts";
import { anyPadStart, createLocalPlayer, peekInput, placePlayer, readInput, toggleCamera, wantsCameraToggle, type Devices, type LocalPlayer } from "../app/localPlayer.ts";
import { cameraPose } from "../app/cameraPose.ts";
import { createPauseMenu } from "../app/pauseMenu.ts";
import { consumePress } from "../input/keyboard.ts";
import { createPrediction, predict, reconcile } from "./prediction.ts";
import { isTouchDevice } from "../app/matchConfig.ts";
import { createTouch } from "../input/touch.ts";
import type { Socket } from "./socket.ts";

const SNAP_MS = 50;

export interface OnlineMatch { onServer(m: ServerMsg): void; stop(): void; /** the result screen is up (no point rejoining) */ over(): boolean }

/** Render the server's match: mirror world from snapshots, predicted own tank, interpolated everyone else. */
export function startOnlineMatch(sock: Socket, myTankId: number, mode: ModeKind, mapId: string | MapJson, renderer: THREE.WebGLRenderer, devices: Devices, sfx: Sfx, hooks: { onOver(w: World): void; onLeave(): void }): OnlineMatch {
  const mirror = createWorld(parseMap(typeof mapId === "string" ? mapById(mapId) : mapId), [], { mode: { kind: mode } });
  const scene = createBattleScene();
  const view = createWorldView(scene, mirror);
  const host = document.querySelector<HTMLElement>("#hud")!;
  host.innerHTML = `<div class="net-status" data-net></div>`;
  const netEl = host.querySelector<HTMLElement>("[data-net]")!;
  const names = (id: number) => mirror.tanks.find((t) => t.id === id)?.name ?? "?";
  const pred = createPrediction();
  const shake = { amount: 0 };
  const pause = createPauseMenu(host, { onQuit: () => { stop(); hooks.onLeave(); } }, "Menu", "Leave match");
  let player: LocalPlayer | undefined;
  let snapPrev: Poses = new Map();
  let lastSnapAt = performance.now(), rtt = 0, overShown = false, prevSnapTick = 0;
  let stopped = false, resultsTimer: ReturnType<typeof setTimeout> | undefined;
  let padStartWas = false;
  const layout = () => player && placePlayer(player, { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }, false);
  window.addEventListener("resize", layout);
  const ping = setInterval(() => sock.send({ t: "ping", at: performance.now() }), 2000);
  Object.assign(window, { reTanx: { world: mirror, get me() { return player?.tank; } } });

  function onSnap(m: Extract<ServerMsg, { t: "snap" }>): void {
    snapPrev = capturePoses(mirror);
    prevSnapTick = mirror.tick;
    applySnapshot(mirror, m.snap);
    const me = mirror.tanks.find((t) => t.id === myTankId);
    if (me && !player) {
      const device = isTouchDevice() ? "touch" : navigator.getGamepads?.()[0] ? "pad0" : "kbm";
      if (device === "touch") devices.touch = createTouch(host);
      player = createLocalPlayer(me, device, host, names);
      layout();
    }
    reconcile(pred, mirror, me, m.ack);
    lastSnapAt = performance.now();
    onSimEvents(view, m.events, mirror);
    if (me) {
      addShake(shake, m.events, me.pos);
      playEvents(sfx, m.events, mirror, me);
      updateEngine(sfx, me);
    }
    if (player) hudEvents(player.hud, m.events, mirror);
    if (mirror.mode.over && !overShown) {
      overShown = true;
      resultsTimer = setTimeout(() => hooks.onOver(mirror), 2000);
    }
  }

  const stopLoop = startLoop(1 / rules.tickRate, {
    step() {
      if (!player || mirror.mode.over) return;
      const input = quantizeInput(pause.open ? idleInput(player.tank.turretRot) : readInput(player, devices, mirror));
      const seq = predict(pred, mirror, player.tank, input);
      // the tick other tanks are drawn at right now, so the server can rewind hitscan shots to what we saw
      const snapAlpha = Math.min(1, (performance.now() - lastSnapAt) / SNAP_MS);
      const view = Math.round(prevSnapTick + (mirror.tick - prevSnapTick) * snapAlpha);
      sock.send({ t: "input", seq, input, view });
    },
    render(alpha, dt) {
      const start = anyPadStart();
      if (consumePress(devices.kb, "Escape") || (start && !padStartWas)) pause.toggle();
      padStartWas = start;
      const snapAlpha = Math.min(1, (performance.now() - lastSnapAt) / SNAP_MS);
      renderWorld(view, mirror, snapPrev, snapAlpha, dt);
      netEl.textContent = `${Math.round(rtt)} ms`;
      if (!player) return;
      if (wantsCameraToggle(player, devices)) toggleCamera(player);
      const own = view.tanks.get(player.tank.id);
      const ownPose = playerPose(mirror, player.tank, peekInput(player, devices, mirror), pause.open ? 0 : alpha);
      if (own) updateTankView(own, player.tank, ownPose);
      const pose = cameraPose(mirror, snapPrev, player.tank, alpha, ownPose);
      updateChaseCam(player.cam, player.camera, pose, dt, shakeOffset(shake, dt), tankDefs[player.tank.kind].radius);
      syncViewerOnly(view, mirror, player.tank);
      fadeFor(view, player.camera, toThree(pose.x, pose.y, 1.5));
      updateHud(player.hud, player.tank, mirror);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
      renderer.render(scene, player.camera);
    },
  });

  playMusic(sfx, "battle");

  function stop(): void {
    if (stopped) return;
    stopped = true;
    stopLoop();
    updateEngine(sfx, undefined);
    devices.touch?.el.remove();
    delete devices.touch;
    clearInterval(ping);
    clearTimeout(resultsTimer);
    window.removeEventListener("resize", layout);
    disposeScene(scene);
    renderer.renderLists.dispose();
  }

  return {
    onServer(m) {
      if (stopped) return;
      if (m.t === "snap") onSnap(m);
      if (m.t === "pong") rtt = performance.now() - m.at;
    },
    stop,
    over: () => mirror.mode.over,
  };
}
