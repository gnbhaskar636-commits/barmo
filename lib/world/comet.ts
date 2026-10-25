/**
 * Comets in the Cosmos world. Everything is derived from the clock, so every visitor sees the same
 * comet at the same moment without anything being sent over the network.
 */
export const COMET_PERIOD = 50_000; // one comet every 50 seconds
export const COMET_FLIGHT = 16_000; // and it takes 16 seconds to cross the sky

export interface CometPhase {
  /** Which comet this is (changes the path). */
  n: number;
  /** 0..1 while a comet is crossing, otherwise -1. */
  k: number;
  /** Seconds until the next one appears (0 while one is crossing). */
  inSec: number;
}

export function cometPhase(now: number): CometPhase {
  const n = Math.floor(now / COMET_PERIOD);
  const into = now - n * COMET_PERIOD;
  if (into < COMET_FLIGHT) return { n, k: into / COMET_FLIGHT, inSec: 0 };
  return { n, k: -1, inSec: Math.ceil((COMET_PERIOD - into) / 1000) };
}

/** Small deterministic random in 0..1 for comet number `n` and channel `i`. */
export function cometRand(n: number, i: number): number {
  const x = Math.sin(n * 127.1 + i * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Where comet `n` is at progress k (0..1). Wide arc across the sky behind the planet. */
export function cometPos(n: number, k: number): [number, number, number] {
  const dir = cometRand(n, 1) > 0.5 ? 1 : -1;
  const y0 = 18 + cometRand(n, 2) * 14;
  const y1 = 6 + cometRand(n, 3) * 10;
  const z0 = -70 + cometRand(n, 4) * 20;
  const z1 = -55 + cometRand(n, 5) * 25;
  const x0 = -dir * 70;
  const x1 = dir * 70;
  return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * 4, z0 + (z1 - z0) * k];
}
