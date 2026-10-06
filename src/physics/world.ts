import { createBody, integrate, type Body, type BodyInit } from './body';
import { anchorSpring, linkSpring, radialForce, resolveCollision } from './forces';

export interface Link<T = unknown> {
  a: Body<T>;
  b: Body<T>;
  rest: number;
  stiffness: number;
  damping: number;
}

export interface WorldPointer {
  x: number;
  y: number;
  active: boolean;
  down: boolean;
}

export type ForceField<T> = (body: Body<T>, world: PhysicsWorld<T>) => void;

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface WorldOptions {
  /** Fixed integration step (s). */
  timestep?: number;
  collisions?: boolean;
  collisionPadding?: number;
  collisionIterations?: number;
  /** Reach of the default pointer attraction/repulsion fields (px). */
  pointerRadius?: number;
  dragStiffness?: number;
  dragDamping?: number;
  bounds?: Bounds | null;
}

/**
 * A small, deterministic 2D physics world for DOM-driven interfaces:
 * bodies with home springs, damped links, pointer fields, soft collisions and
 * momentum-preserving drag. Fixed-timestep integration keeps it frame-rate independent.
 */
export class PhysicsWorld<T = unknown> {
  bodies: Body<T>[] = [];
  links: Link<T>[] = [];
  fields: ForceField<T>[] = [];
  pointer: WorldPointer = { x: 0, y: 0, active: false, down: false };
  /** Uniform acceleration applied to every free body (used for scroll inertia). */
  gravity = { x: 0, y: 0 };

  timestep: number;
  collisions: boolean;
  collisionPadding: number;
  collisionIterations: number;
  pointerRadius: number;
  dragStiffness: number;
  dragDamping: number;
  bounds: Bounds | null;

  private accumulator = 0;
  private dragBody: Body<T> | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private index = new Map<string, Body<T>>();

  constructor(options: WorldOptions = {}) {
    this.timestep = options.timestep ?? 1 / 120;
    this.collisions = options.collisions ?? true;
    this.collisionPadding = options.collisionPadding ?? 6;
    this.collisionIterations = options.collisionIterations ?? 2;
    this.pointerRadius = options.pointerRadius ?? 180;
    this.dragStiffness = options.dragStiffness ?? 520;
    this.dragDamping = options.dragDamping ?? 34;
    this.bounds = options.bounds ?? null;
  }

  add(init: BodyInit<T>): Body<T> {
    const body = createBody<T>(init);
    this.bodies.push(body);
    this.index.set(body.id, body);
    return body;
  }

  get(id: string) {
    return this.index.get(id);
  }

  /** Connect two bodies with a damped spring. Rest length defaults to their home distance. */
  connect(
    a: Body<T> | string,
    b: Body<T> | string,
    opts: { rest?: number; stiffness?: number; damping?: number } = {},
  ): Link<T> {
    const ba = typeof a === 'string' ? this.index.get(a) : a;
    const bb = typeof b === 'string' ? this.index.get(b) : b;
    if (!ba || !bb) throw new Error(`PhysicsWorld.connect: unknown body ${String(a)} / ${String(b)}`);
    const link: Link<T> = {
      a: ba,
      b: bb,
      rest: opts.rest ?? Math.hypot(bb.homeX - ba.homeX, bb.homeY - ba.homeY),
      stiffness: opts.stiffness ?? 8,
      damping: opts.damping ?? 1.5,
    };
    this.links.push(link);
    return link;
  }

  /** Nearest body whose radius contains the point. */
  hitTest(px: number, py: number): Body<T> | null {
    let best: Body<T> | null = null;
    let bestD = Infinity;
    for (const b of this.bodies) {
      const d = Math.hypot(b.x - px, b.y - py);
      if (d < b.radius && d < bestD) {
        best = b;
        bestD = d;
      }
    }
    return best;
  }

  startDrag(body: Body<T>, px: number, py: number) {
    this.dragBody = body;
    body.dragging = true;
    this.dragOffsetX = body.x - px;
    this.dragOffsetY = body.y - py;
  }

  /** Releases the dragged body. Its velocity is preserved, so it glides with momentum. */
  endDrag(): Body<T> | null {
    const body = this.dragBody;
    if (body) body.dragging = false;
    this.dragBody = null;
    return body;
  }

  get dragged() {
    return this.dragBody;
  }

  /** Re-home bodies, e.g. after a resize. */
  setHome(id: string, x: number, y: number, snap = false) {
    const b = this.index.get(id);
    if (!b) return;
    b.homeX = x;
    b.homeY = y;
    if (snap) {
      b.x = x;
      b.y = y;
      b.vx = b.vy = 0;
    }
  }

  /** Advance the simulation by `dt` seconds. Returns total kinetic energy (for sleeping). */
  update(dt: number): number {
    this.accumulator += Math.min(dt, 0.05);
    let steps = 0;
    while (this.accumulator >= this.timestep && steps < 8) {
      this.substep(this.timestep);
      this.accumulator -= this.timestep;
      steps++;
    }
    if (steps === 8) this.accumulator = 0;
    return this.kineticEnergy();
  }

  /** Run the simulation synchronously — used to pre-settle layouts for reduced motion. */
  settle(seconds: number) {
    const n = Math.ceil(seconds / this.timestep);
    for (let i = 0; i < n; i++) this.substep(this.timestep);
  }

  kineticEnergy() {
    let e = 0;
    for (const b of this.bodies) e += 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy);
    return e;
  }

  private substep(h: number) {
    const { pointer, bodies } = this;

    for (const b of bodies) {
      if (!b.dragging) anchorSpring(b, b.homeX, b.homeY, b.springStrength);
      b.fx += this.gravity.x * b.mass;
      b.fy += this.gravity.y * b.mass;

      if (pointer.active && !b.dragging) {
        if (b.repulsion) radialForce(b, pointer.x, pointer.y, b.repulsion, this.pointerRadius);
        if (b.attraction) radialForce(b, pointer.x, pointer.y, -b.attraction, this.pointerRadius * 1.6);
      }
      for (const field of this.fields) field(b, this);
    }

    for (const l of this.links) linkSpring(l.a, l.b, l.rest, l.stiffness, l.damping);

    const drag = this.dragBody;
    if (drag) {
      // The dragged body chases the pointer through a stiff spring — never teleports.
      const tx = pointer.x + this.dragOffsetX;
      const ty = pointer.y + this.dragOffsetY;
      drag.fx += ((tx - drag.x) * this.dragStiffness - drag.vx * this.dragDamping) * drag.mass;
      drag.fy += ((ty - drag.y) * this.dragStiffness - drag.vy * this.dragDamping) * drag.mass;
    }

    for (const b of bodies) integrate(b, h);

    if (this.collisions) {
      for (let it = 0; it < this.collisionIterations; it++) {
        for (let i = 0; i < bodies.length; i++) {
          for (let j = i + 1; j < bodies.length; j++) {
            resolveCollision(bodies[i], bodies[j], this.collisionPadding);
          }
        }
      }
    }

    if (this.bounds) {
      const { minX, minY, maxX, maxY } = this.bounds;
      for (const b of bodies) {
        if (b.x < minX + b.radius) {
          b.x = minX + b.radius;
          b.vx = Math.abs(b.vx) * 0.4;
        } else if (b.x > maxX - b.radius) {
          b.x = maxX - b.radius;
          b.vx = -Math.abs(b.vx) * 0.4;
        }
        if (b.y < minY + b.radius) {
          b.y = minY + b.radius;
          b.vy = Math.abs(b.vy) * 0.4;
        } else if (b.y > maxY - b.radius) {
          b.y = maxY - b.radius;
          b.vy = -Math.abs(b.vy) * 0.4;
        }
      }
    }
  }
}
