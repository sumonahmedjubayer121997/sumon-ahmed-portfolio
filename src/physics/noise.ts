/**
 * Cheap, smooth, divergence-poor flow field built from layered sines. Returns an
 * angle; particles following it drift in organic, never-repeating swirls.
 */
export function flowAngle(x: number, y: number, t: number) {
  return (
    (Math.sin(x * 1.7 + t) +
      Math.sin(y * 1.3 - t * 0.8) +
      Math.sin((x + y) * 0.9 + t * 0.5) +
      Math.cos(x * 0.6 - y * 1.1)) *
    1.1
  );
}

/** Smooth scalar noise in [-1, 1] for jitter. */
export function wobble(seed: number, t: number) {
  return Math.sin(t * 1.3 + seed * 12.9898) * 0.6 + Math.sin(t * 0.7 + seed * 78.233) * 0.4;
}
