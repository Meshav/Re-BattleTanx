/** Seeded PRNG (mulberry32) kept as plain state so worlds stay serialisable and replayable. */
export interface Rng { state: number }

export function nextRandom(rng: Rng): number {
  rng.state = (rng.state + 0x6d2b79f5) | 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(nextRandom(rng) * items.length)]!;
}

export function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(rng) * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
