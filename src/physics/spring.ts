import { clamp } from '@/lib/math';

/**
 * Damped harmonic oscillator, integrated with semi-implicit Euler and sub-stepped
 * so it stays stable at any frame rate:
 *
 *   displacement → force (−k·x − c·v) → acceleration (F/m) → velocity → position
 */
export interface SpringConfig {
  /** k — how strongly the value is pulled toward its target. */
  stiffness: number;
  /** c — velocity-proportional friction. */
  damping: number;
  /** m — inertia. Heavier springs accelerate and settle more slowly. */
  mass: number;
  /** Optional speed cap (units/s). */
  maxVelocity?: number;
  /** Settle thresholds. */
  restDelta?: number;
  restSpeed?: number;
}

export const springs = {
  /** UI elements returning home. */
  gentle: { stiffness: 140, damping: 18, mass: 1 },
  /** Magnetic buttons: responsive with a hint of overshoot. */
  magnetic: { stiffness: 170, damping: 13, mass: 1 },
  /** Cursor dot: nearly immediate but never jumps. */
  cursor: { stiffness: 1100, damping: 62, mass: 1 },
  /** Cursor bubble: visible lag. */
  lag: { stiffness: 260, damping: 26, mass: 1 },
  /** Scroll-driven progress: soft and heavy. */
  scroll: { stiffness: 90, damping: 20, mass: 1 },
  /** Size/scale changes. */
  scale: { stiffness: 320, damping: 24, mass: 1 },
} satisfies Record<string, SpringConfig>;

const MAX_STEP = 1 / 120;

export interface Spring1D {
  value: number;
  velocity: number;
  target: number;
}

export interface Spring2D {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
}

export const createSpring1D = (value = 0): Spring1D => ({ value, velocity: 0, target: value });

export const createSpring2D = (x = 0, y = 0): Spring2D => ({ x, y, vx: 0, vy: 0, tx: x, ty: y });

/** Advances a 1D spring; returns true when it has come to rest. */
export function stepSpring1D(s: Spring1D, cfg: SpringConfig, dt: number): boolean {
  const steps = Math.max(1, Math.ceil(dt / MAX_STEP));
  const h = dt / steps;
  const maxV = cfg.maxVelocity ?? Infinity;
  for (let i = 0; i < steps; i++) {
    const force = -cfg.stiffness * (s.value - s.target) - cfg.damping * s.velocity;
    s.velocity = clamp(s.velocity + (force / cfg.mass) * h, -maxV, maxV);
    s.value += s.velocity * h;
  }
  const settled =
    Math.abs(s.value - s.target) < (cfg.restDelta ?? 0.001) && Math.abs(s.velocity) < (cfg.restSpeed ?? 0.01);
  if (settled) {
    s.value = s.target;
    s.velocity = 0;
  }
  return settled;
}

/** Advances a 2D spring; returns true when it has come to rest. */
export function stepSpring2D(s: Spring2D, cfg: SpringConfig, dt: number): boolean {
  const steps = Math.max(1, Math.ceil(dt / MAX_STEP));
  const h = dt / steps;
  const maxV = cfg.maxVelocity ?? Infinity;
  for (let i = 0; i < steps; i++) {
    const fx = -cfg.stiffness * (s.x - s.tx) - cfg.damping * s.vx;
    const fy = -cfg.stiffness * (s.y - s.ty) - cfg.damping * s.vy;
    s.vx += (fx / cfg.mass) * h;
    s.vy += (fy / cfg.mass) * h;
    if (maxV !== Infinity) {
      const sp = Math.hypot(s.vx, s.vy);
      if (sp > maxV) {
        s.vx *= maxV / sp;
        s.vy *= maxV / sp;
      }
    }
    s.x += s.vx * h;
    s.y += s.vy * h;
  }
  const delta = cfg.restDelta ?? 0.01;
  const speed = cfg.restSpeed ?? 0.05;
  const settled =
    Math.abs(s.x - s.tx) < delta && Math.abs(s.y - s.ty) < delta && Math.abs(s.vx) < speed && Math.abs(s.vy) < speed;
  if (settled) {
    s.x = s.tx;
    s.y = s.ty;
    s.vx = s.vy = 0;
  }
  return settled;
}
