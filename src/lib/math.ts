export const clamp = (v: number, min = 0, max = 1) => (v < min ? min : v > max ? max : v);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));

export const mapRange = (v: number, a1: number, b1: number, a2: number, b2: number) => lerp(a2, b2, invLerp(a1, b1, v));

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/** Bell-shaped bump: 1 at `center`, 0 beyond ±width. */
export const bump = (x: number, center: number, width: number) => {
  const t = clamp(1 - Math.abs(x - center) / width);
  return t * t * (3 - 2 * t);
};

/** Frame-rate independent exponential smoothing. `lambda` ≈ 1/time-constant. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const TAU = Math.PI * 2;
