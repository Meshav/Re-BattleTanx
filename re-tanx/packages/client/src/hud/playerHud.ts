import { TANKS, TICK_RATE, type Tank, type World } from '@re-tanx/sim';
import { createMinimap } from './minimap';

export function createPlayerHud(root: HTMLElement) {
  const health = root.querySelector<HTMLProgressElement>('#hull-health')!;
  const healthLabel = root.querySelector<HTMLElement>('#health-value')!;
  const speed = root.querySelector<HTMLElement>('#speed-value')!;
  const heading = root.querySelector<HTMLElement>('#heading-value')!;
  const coordinates = root.querySelector<HTMLElement>('#coordinates')!;
  const clock = root.querySelector<HTMLElement>('#session-time')!;
  const updateMap = createMinimap(root);

  return (world: World, tank: Tank): void => {
    const maxHp = TANKS[tank.kind].hp;
    health.max = maxHp;
    health.value = tank.hp;
    healthLabel.textContent = `${Math.ceil(tank.hp)} / ${maxHp}`;
    speed.textContent = Math.abs(tank.speed * 3.6).toFixed(0);
    const bearing = (((90 - (tank.heading * 180) / Math.PI) % 360) + 360) % 360;
    heading.textContent = `${String(Math.round(bearing) % 360).padStart(3, '0')}°`;
    coordinates.textContent = `E ${tank.x.toFixed(0)} · N ${tank.y.toFixed(0)}`;
    const seconds = Math.floor(world.tick / TICK_RATE);
    clock.textContent = `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    updateMap(tank);
  };
}
