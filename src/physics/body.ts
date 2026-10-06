/**
 * A rigid point-mass. Every interactive object in the physics UI is one of these.
 */
export interface Body<T = unknown> {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Force accumulator, cleared after each integration step. */
  fx: number;
  fy: number;
  /** Rest position the body springs back to. */
  homeX: number;
  homeY: number;
  mass: number;
  /** Linear drag, per second. 0 = frictionless. */
  friction: number;
  /** Hooke constant pulling the body toward home. */
  springStrength: number;
  /** Gain for pointer attraction fields. */
  attraction: number;
  /** Gain for pointer repulsion fields. */
  repulsion: number;
  maxVelocity: number;
  /** Collision radius. */
  radius: number;
  pinned: boolean;
  dragging: boolean;
  data: T;
}

export type BodyInit<T = unknown> = Partial<Omit<Body<T>, 'id' | 'x' | 'y'>> & { id: string; x: number; y: number };

export function createBody<T = unknown>(init: BodyInit<T>): Body<T> {
  return {
    vx: 0,
    vy: 0,
    fx: 0,
    fy: 0,
    homeX: init.x,
    homeY: init.y,
    mass: 1,
    friction: 4,
    springStrength: 20,
    attraction: 0,
    repulsion: 0,
    maxVelocity: 2400,
    radius: 24,
    pinned: false,
    dragging: false,
    data: undefined as T,
    ...init,
  };
}

/** Semi-implicit Euler: force → acceleration → velocity → position. */
export function integrate(b: Body, h: number) {
  if (b.pinned) {
    b.vx = b.vy = b.fx = b.fy = 0;
    return;
  }
  b.vx += (b.fx / b.mass) * h;
  b.vy += (b.fy / b.mass) * h;
  const drag = Math.exp(-b.friction * h);
  b.vx *= drag;
  b.vy *= drag;
  const sp2 = b.vx * b.vx + b.vy * b.vy;
  if (sp2 > b.maxVelocity * b.maxVelocity) {
    const s = b.maxVelocity / Math.sqrt(sp2);
    b.vx *= s;
    b.vy *= s;
  }
  b.x += b.vx * h;
  b.y += b.vy * h;
  b.fx = 0;
  b.fy = 0;
}
