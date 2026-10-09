import type { Body } from './body';

/** Hooke spring from a body to a fixed point. */
export function anchorSpring(b: Body, ax: number, ay: number, k: number, damping = 0) {
  b.fx += -(b.x - ax) * k - b.vx * damping;
  b.fy += -(b.y - ay) * k - b.vy * damping;
}

/**
 * Radial field centred on (px, py). Positive strength repels, negative attracts.
 * Quadratic falloff reaches zero at `radius`, so there is never a hard edge.
 * Returns the normalised influence (0…1) for visual feedback.
 */
export function radialForce(b: Body, px: number, py: number, strength: number, radius: number): number {
  const dx = b.x - px;
  const dy = b.y - py;
  const d2 = dx * dx + dy * dy;
  if (d2 >= radius * radius) return 0;
  const d = Math.sqrt(d2) || 0.0001;
  const t = 1 - d / radius;
  const f = strength * t * t;
  b.fx += (dx / d) * f;
  b.fy += (dy / d) * f;
  return t;
}

/** Damped spring between two bodies along their connecting axis. */
export function linkSpring(a: Body, b: Body, rest: number, k: number, damping: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
  const nx = dx / d;
  const ny = dy / d;
  const relV = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  const f = k * (d - rest) + damping * relV;
  a.fx += nx * f;
  a.fy += ny * f;
  b.fx -= nx * f;
  b.fy -= ny * f;
}

/**
 * Soft circle–circle collision. Separates overlapping bodies in proportion to
 * their inverse mass and removes the approaching component of velocity.
 * Returns the speed at which they were approaching (0 if they weren't touching
 * or were already moving apart).
 */
export function resolveCollision(a: Body, b: Body, padding: number, restitution = 0.15): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const min = a.radius + b.radius + padding;
  const d2 = dx * dx + dy * dy;
  if (d2 >= min * min) return 0;
  const d = Math.sqrt(d2) || 0.0001;
  const nx = dx / d;
  const ny = dy / d;
  const overlap = min - d;
  const ia = a.pinned || a.dragging ? 0 : 1 / a.mass;
  const ib = b.pinned || b.dragging ? 0 : 1 / b.mass;
  const sum = ia + ib;
  if (sum === 0) return 0;
  // Positional correction (soft — 50% per iteration avoids jitter).
  const corr = (overlap * 0.5) / sum;
  a.x -= nx * corr * ia;
  a.y -= ny * corr * ia;
  b.x += nx * corr * ib;
  b.y += ny * corr * ib;
  // Velocity response along the normal.
  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rel < 0) {
    const j = (-(1 + restitution) * rel) / sum;
    a.vx -= nx * j * ia;
    a.vy -= ny * j * ia;
    b.vx += nx * j * ib;
    b.vy += ny * j * ib;
    return -rel;
  }
  return 0;
}
