import type { InputState } from '@re-tanx/sim';

const held = new Set<string>();

export function startKeyboard(): void {
  addEventListener('keydown', (e) => held.add(e.code));
  addEventListener('keyup', (e) => held.delete(e.code));
  addEventListener('blur', () => held.clear());
}

export function readKeyboard(): InputState {
  return {
    throttle: axis('KeyW', 'KeyS'),
    steer: axis('KeyA', 'KeyD'),
  };
}

function axis(positive: string, negative: string): number {
  return (held.has(positive) ? 1 : 0) - (held.has(negative) ? 1 : 0);
}
