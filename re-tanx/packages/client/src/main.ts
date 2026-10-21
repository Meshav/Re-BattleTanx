import { createTank, createWorld } from '@re-tanx/sim';
import { readKeyboard, startKeyboard } from './input/keyboard';
import { startLoop } from './loop';
import { followChase } from './render/camera/chase';
import { createScene } from './render/scene';
import { createTankView } from './render/views/tankView';

const PLAYER_ID = 1;

const world = createWorld();
world.tanks.push(createTank(PLAYER_ID, 'm1', 0, 0));

const { scene, camera, render } = createScene();
const playerView = createTankView();
scene.add(playerView.object);

startKeyboard();

let lastRender = performance.now();
startLoop(world, {
  readInputs: () => new Map([[PLAYER_ID, readKeyboard()]]),
  render(prev, alpha) {
    const now = performance.now();
    const dt = (now - lastRender) / 1000;
    lastRender = now;

    const tank = world.tanks.find((t) => t.id === PLAYER_ID);
    const pose = prev.get(PLAYER_ID);
    if (tank && pose) playerView.update(tank, pose, alpha);
    followChase(camera, playerView.object, dt);
    render();
  },
});
