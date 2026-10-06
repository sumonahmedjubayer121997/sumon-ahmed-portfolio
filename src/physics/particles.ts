import type { Random } from '@/lib/random';
import { flowAngle } from './noise';
import { SpatialHash } from './spatialHash';

export interface ParticleInput {
  /** Pointer position in field space. */
  x: number;
  y: number;
  active: boolean;
  down: boolean;
}

export interface ParticleFieldParams {
  /** Velocity damping per second. */
  friction: number;
  /** Spring constant toward each particle's target (scaled by order × weight). */
  springStrength: number;
  maxVelocity: number;
  /** Organic flow-field acceleration (px/s²). */
  noiseStrength: number;
  noiseScale: number;
  noiseSpeed: number;
  /** 0…1 — how strongly the system is organised into its target structure. */
  order: number;
  pointerRadius: number;
  /** Short-range push away from the pointer. */
  repulsion: number;
  /** Mid-range pull that forms a ring around the pointer. */
  attraction: number;
  /** Pull toward the pointer while pressed. */
  pressAttraction: number;
}

export const defaultParticleParams: ParticleFieldParams = {
  friction: 2.4,
  springStrength: 7,
  maxVelocity: 900,
  noiseStrength: 70,
  noiseScale: 0.0042,
  noiseSpeed: 0.18,
  order: 0,
  pointerRadius: 170,
  repulsion: 5200,
  attraction: 1400,
  pressAttraction: 4200,
};

/**
 * CPU particle simulation over flat typed arrays (GPU-upload friendly).
 * Each particle obeys: flow field + spring to target + pointer fields → acceleration
 * → velocity (with friction & cap) → position.
 */
export class ParticleField {
  readonly count: number;
  readonly positions: Float32Array;
  readonly velocities: Float32Array;
  readonly targets: Float32Array;
  /** Per-particle order weight: 0 = free-roaming, 1 = locks fully into structure. */
  readonly weights: Float32Array;
  readonly mass: Float32Array;
  /** 0…1 excitation from pointer interaction, decays over time. */
  readonly energy: Float32Array;
  readonly seeds: Float32Array;
  halfW = 600;
  halfH = 400;
  /** Mean normalised distance from targets for structured particles (0 = perfect order). */
  disorder = 1;
  /** Mean excitation across the field. */
  excitation = 0;

  constructor(count: number, random: Random) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.targets = new Float32Array(count * 3);
    this.weights = new Float32Array(count);
    this.mass = new Float32Array(count);
    this.energy = new Float32Array(count);
    this.seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.mass[i] = 0.7 + random.next() * 0.8;
      this.seeds[i] = random.next() * 100;
    }
  }

  setBounds(halfW: number, halfH: number) {
    this.halfW = halfW;
    this.halfH = halfH;
  }

  /** Scatter particles uniformly — the "raw data" state. */
  scatter(random: Random) {
    for (let i = 0; i < this.count; i++) {
      this.positions[i * 3] = random.range(-this.halfW, this.halfW);
      this.positions[i * 3 + 1] = random.range(-this.halfH, this.halfH);
      this.positions[i * 3 + 2] = random.range(-80, 80);
    }
  }

  step(dt: number, time: number, input: ParticleInput, p: ParticleFieldParams) {
    const { positions: pos, velocities: vel, targets: tgt, weights, mass, energy, seeds, count } = this;
    const damp = Math.exp(-p.friction * dt);
    const decay = Math.exp(-dt * 1.4);
    const r = p.pointerRadius;
    const r2 = r * r;
    const maxV2 = p.maxVelocity * p.maxVelocity;
    const wrapX = this.halfW + 40;
    const wrapY = this.halfH + 40;
    const nt = time * p.noiseSpeed;
    let disorder = 0;
    let structured = 0;
    let excitation = 0;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const x = pos[ix];
      const y = pos[ix + 1];
      const z = pos[ix + 2];
      const w = weights[i] * p.order;

      // Organic drift, quietened as the particle locks into structure.
      const a = flowAngle(x * p.noiseScale, y * p.noiseScale, nt + seeds[i] * 0.01);
      const noise = p.noiseStrength * (1 - 0.85 * w);
      let fx = Math.cos(a) * noise;
      let fy = Math.sin(a) * noise;
      let fz = Math.sin(a * 0.7 + seeds[i]) * noise * 0.3;

      // Spring toward target structure.
      const k = p.springStrength * w;
      const dxT = tgt[ix] - x;
      const dyT = tgt[ix + 1] - y;
      fx += dxT * k;
      fy += dyT * k;
      fz += (tgt[ix + 2] - z) * k * 0.6;

      // Pointer fields: repel close, gently attract at mid range; attract when pressed.
      if (input.active) {
        const dx = x - input.x;
        const dy = y - input.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const d = Math.sqrt(d2) || 0.001;
          const t = 1 - d / r;
          const push = input.down ? -p.pressAttraction * t : p.repulsion * t * t * t - p.attraction * t * (1 - t);
          fx += (dx / d) * push;
          fy += (dy / d) * push;
          if (t > energy[i]) energy[i] = t;
        }
      }
      energy[i] *= decay;
      excitation += energy[i];

      const m = mass[i];
      let vx = (vel[ix] + (fx / m) * dt) * damp;
      let vy = (vel[ix + 1] + (fy / m) * dt) * damp;
      const vz = (vel[ix + 2] + (fz / m) * dt) * damp;
      const sp2 = vx * vx + vy * vy;
      if (sp2 > maxV2) {
        const s = p.maxVelocity / Math.sqrt(sp2);
        vx *= s;
        vy *= s;
      }
      vel[ix] = vx;
      vel[ix + 1] = vy;
      vel[ix + 2] = vz;

      let nx = x + vx * dt;
      let ny = y + vy * dt;
      // Free particles wrap around the field so the "raw data" never drains away.
      if (w < 0.15) {
        if (nx > wrapX) nx = -wrapX;
        else if (nx < -wrapX) nx = wrapX;
        if (ny > wrapY) ny = -wrapY;
        else if (ny < -wrapY) ny = wrapY;
      }
      pos[ix] = nx;
      pos[ix + 1] = ny;
      pos[ix + 2] = z + vz * dt;

      if (weights[i] > 0.3) {
        const dist = Math.sqrt(dxT * dxT + dyT * dyT);
        disorder += dist > 160 ? 1 : dist / 160;
        structured++;
      }
    }

    this.disorder = structured ? disorder / structured : 0;
    this.excitation = excitation / count;
  }
}

export interface LinkOptions {
  maxDist: number;
  maxPerNode: number;
  maxSegments: number;
}

/**
 * Proximity links between particles, written straight into line-segment buffers.
 * Alpha falls off with distance and rises with pointer excitation, so connections
 * appear and dissolve as the system moves.
 */
export function buildLinks(
  positions: Float32Array,
  count: number,
  hash: SpatialHash,
  halfW: number,
  halfH: number,
  opts: LinkOptions,
  linkCounts: Uint8Array,
  outPositions: Float32Array,
  outAlpha: Float32Array,
  energy?: Float32Array,
): number {
  const margin = 80;
  hash.build(
    positions,
    count,
    -halfW - margin,
    -halfH - margin,
    halfW * 2 + margin * 2,
    halfH * 2 + margin * 2,
    opts.maxDist,
  );
  linkCounts.fill(0, 0, count);
  let n = 0;
  hash.forEachPair(positions, opts.maxDist, (i, j, d) => {
    if (linkCounts[i] >= opts.maxPerNode || linkCounts[j] >= opts.maxPerNode) return;
    const t = 1 - d / opts.maxDist;
    const excite = energy ? Math.max(energy[i], energy[j]) : 0;
    const alpha = t * t * (0.55 + excite * 1.6);
    if (alpha < 0.02) return;
    linkCounts[i]++;
    linkCounts[j]++;
    const o = n * 6;
    outPositions[o] = positions[i * 3];
    outPositions[o + 1] = positions[i * 3 + 1];
    outPositions[o + 2] = positions[i * 3 + 2];
    outPositions[o + 3] = positions[j * 3];
    outPositions[o + 4] = positions[j * 3 + 1];
    outPositions[o + 5] = positions[j * 3 + 2];
    outAlpha[n * 2] = alpha;
    outAlpha[n * 2 + 1] = alpha;
    n++;
    if (n >= opts.maxSegments) return false;
  });
  return n;
}
