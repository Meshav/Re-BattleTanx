import { createTank, createWorld } from '@re-tanx/sim';
import { createScreens } from './app/screens';
import { createPlayerHud } from './hud/playerHud';
import { readKeyboard, startKeyboard } from './input/keyboard';
import { startLoop } from './loop';
import { followChase } from './render/camera/chase';
import { createScene } from './render/scene';
import { createTankView } from './render/views/tankView';
import './style.css';

const PLAYER_ID = 1;
const { scene, camera, render } = createScene();
const playerView = createTankView();
scene.add(playerView.object);
const updateHud = createPlayerHud(document.querySelector('#hud')!);
let stopLoop: (() => void) | undefined;
const screens = createScreens({ deploy, quit: () => stopLoop?.() });
startKeyboard();
followChase(camera, playerView.object, 10);
render();

function deploy(): void {
  stopLoop?.();
  const world = createWorld();
  const tank = createTank(PLAYER_ID, 'm1', 0, 0);
  world.tanks.push(tank);
  playerView.update(tank, tank, 1);
  followChase(camera, playerView.object, 10);
  updateHud(world, tank);
  let lastRender = performance.now();

  stopLoop = startLoop(world, {
    isRunning: screens.isRunning,
    readInputs: () => new Map([[PLAYER_ID, readKeyboard()]]),
    render(prev, alpha) {
      const now = performance.now();
      const dt = Math.min((now - lastRender) / 1000, 0.25);
      lastRender = now;
      const pose = prev.get(PLAYER_ID);
      if (pose) playerView.update(tank, pose, alpha);
      followChase(camera, playerView.object, dt);
      updateHud(world, tank);
      render();
    },
  });
}
