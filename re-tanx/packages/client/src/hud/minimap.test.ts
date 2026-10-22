import { expect, it } from 'vitest';
import { mapPosition } from './minimap';

it('maps sim coordinates north-up with the correct player heading', () => {
  expect(mapPosition({ x: 0, y: 0, heading: 0 })).toMatchObject({
    x: 100,
    y: 100,
    rotation: 90,
    span: 200,
    outside: false,
  });
  expect(mapPosition({ x: 50, y: 50, heading: Math.PI / 2 })).toMatchObject({
    x: 145,
    y: 55,
    rotation: 0,
  });
  expect(mapPosition({ x: -50, y: -50, heading: Math.PI })).toMatchObject({
    x: 55,
    y: 145,
    rotation: -90,
  });
});

it('keeps the player visible outside the ground and scales its boundary accurately', () => {
  const point = mapPosition({ x: 500, y: -300, heading: 0 });
  expect(point.outside).toBe(true);
  expect(point.x).toBeLessThan(190);
  expect(point.y).toBeLessThan(190);
  expect(point.span).toBe(1100);
  expect(point.groundSize).toBeCloseTo((200 / 550) * 90);
});
