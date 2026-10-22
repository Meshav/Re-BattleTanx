import type { Tank } from '@re-tanx/sim';
import ground from '../../../../data/training-ground.json';

/** North is +sim y; SVG y points down. Expand the chart beyond the graybox. */
export function mapPosition(tank: Pick<Tank, 'x' | 'y' | 'heading'>) {
  const half = ground.size / 2;
  const extent = Math.max(
    half,
    Math.ceil((Math.max(Math.abs(tank.x), Math.abs(tank.y)) + 10) / 50) * 50,
  );
  return {
    x: 100 + (tank.x / extent) * 90,
    y: 100 - (tank.y / extent) * 90,
    rotation: 90 - (tank.heading * 180) / Math.PI,
    groundSize: (ground.size / extent) * 90,
    span: extent * 2,
    outside: Math.abs(tank.x) > half || Math.abs(tank.y) > half,
  };
}

export function createMinimap(root: HTMLElement) {
  const marker = root.querySelector<SVGElement>('#map-player')!;
  const boundary = root.querySelector<SVGElement>('#map-ground')!;
  const scale = root.querySelector<HTMLElement>('#map-scale')!;
  const status = root.querySelector<HTMLElement>('#map-status')!;
  return (tank: Tank): void => {
    const point = mapPosition(tank);
    marker.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${point.rotation})`);
    boundary.setAttribute('x', String(100 - point.groundSize / 2));
    boundary.setAttribute('y', String(100 - point.groundSize / 2));
    boundary.setAttribute('width', String(point.groundSize));
    boundary.setAttribute('height', String(point.groundSize));
    scale.textContent = `${point.span} m across`;
    status.textContent = point.outside ? 'Outside training ground' : 'Training ground';
  };
}
