import { clamp, lerp } from './math';
import type { Random } from './random';
import { SpatialHash } from '@/physics/spatialHash';

/**
 * Target structure for the hero simulation — "data → intelligence".
 *
 * Particles organise into a band of columns. On the left the columns are dense
 * and noisy (raw data); moving right they thin out, tighten and align into a
 * lattice with structural links, converging on a few decision nodes. Order is a
 * continuous gradient, so the picture reads as entropy decreasing, not as an icon.
 *
 * Pure TypeScript (no three.js) so the static SVG fallback renders the same shape.
 * Coordinates: origin at centre, y up, units = CSS px.
 */
export interface HeroStructure {
  count: number;
  targets: Float32Array;
  /** Order weight per particle (0 = free, 1 = fully structured). */
  weights: Float32Array;
  sizes: Float32Array;
  accent: Float32Array;
  /** Precomputed structural link pairs (i, j) and their rest lengths. */
  links: Uint16Array;
  rest: Float32Array;
}

/** Vertical band (px from the top of the hero) the structure should occupy. */
export interface HeroBand {
  center: number;
  height: number;
}

export function buildHeroStructure(
  count: number,
  width: number,
  height: number,
  compact: boolean,
  random: Random,
  band?: HeroBand | null,
): HeroStructure {
  const targets = new Float32Array(count * 3);
  const weights = new Float32Array(count);
  const sizes = new Float32Array(count);
  const accent = new Float32Array(count);

  const nFree = Math.round(count * 0.2);
  const nLattice = count - nFree;
  const cols = compact ? 9 : clamp(Math.round(width / 54), 14, 30);
  const x0 = -width * (compact ? 0.42 : 0.46);
  const x1 = width * (compact ? 0.4 : 0.43);
  const cy = band ? height / 2 - band.center : height * (compact ? -0.04 : 0.0);
  const bandH = band ? band.height : height * (compact ? 0.26 : 0.38);
  const colSpacing = (x1 - x0) / (cols - 1);

  // Column populations fall off left → right; the last column holds 3 decision nodes.
  const decision = 3;
  const share = Array.from({ length: cols - 1 }, (_, c) => 1 - 0.78 * (c / (cols - 1)));
  const shareSum = share.reduce((a, b) => a + b, 0);
  const counts = share.map((s) => Math.max(2, Math.floor((s / shareSum) * (nLattice - decision))));
  counts.push(decision);
  let assigned = counts.reduce((a, b) => a + b, 0);
  for (let c = 0; assigned < nLattice; c = (c + 1) % (cols - 1)) {
    counts[c]++;
    assigned++;
  }

  const columnStart: number[] = [];
  let i = 0;
  for (let c = 0; c < cols; c++) {
    columnStart.push(i);
    const u = c / (cols - 1);
    const chaos = Math.pow(1 - u, 1.7);
    const h = bandH * (1 - 0.62 * Math.pow(u, 1.15));
    const m = counts[c];
    for (let k = 0; k < m && i < nLattice; k++, i++) {
      const v = m === 1 ? 0.5 : k / (m - 1);
      const x = x0 + c * colSpacing + random.gaussian() * colSpacing * 0.95 * chaos;
      const y = cy + (v - 0.5) * h + random.gaussian() * ((h / m) * 1.3 + 18) * chaos;
      const z = random.gaussian() * 70 * chaos;
      targets[i * 3] = x;
      targets[i * 3 + 1] = y;
      targets[i * 3 + 2] = z;
      weights[i] = 0.28 + 0.72 * u;
      sizes[i] = lerp(1.9, 3.1, u) * (0.85 + random.next() * 0.3) + (c === cols - 1 ? 2.6 : 0);
      accent[i] = c === cols - 1 ? 1 : 0;
    }
  }
  columnStart.push(i);

  // Free particles keep wandering across the whole hero.
  for (; i < count; i++) {
    targets[i * 3] = random.range(-width / 2, width / 2);
    targets[i * 3 + 1] = random.range(-height / 2, height / 2);
    targets[i * 3 + 2] = random.range(-60, 60);
    weights[i] = 0.04;
    sizes[i] = 1.4 + random.next() * 1.1;
    accent[i] = random.next() < 0.035 ? 1 : 0;
  }

  // Structural links: each node in the ordered region connects to its 2 nearest
  // nodes in the next column — the lattice that emerges as order rises.
  const pairs: number[] = [];
  const rest: number[] = [];
  const firstOrdered = Math.floor((cols - 1) * 0.3);
  for (let c = firstOrdered; c < cols - 1; c++) {
    for (let a = columnStart[c]; a < columnStart[c + 1]; a++) {
      const near: Array<[number, number]> = [];
      for (let b = columnStart[c + 1]; b < columnStart[c + 2]; b++) {
        const d = Math.hypot(targets[b * 3] - targets[a * 3], targets[b * 3 + 1] - targets[a * 3 + 1]);
        near.push([d, b]);
      }
      near.sort((p, q) => p[0] - q[0]);
      for (const [d, b] of near.slice(0, 2)) {
        pairs.push(a, b);
        rest.push(d);
      }
    }
  }

  return {
    count,
    targets,
    weights,
    sizes,
    accent,
    links: Uint16Array.from(pairs),
    rest: Float32Array.from(rest),
  };
}

export interface HeroLinkOptions {
  maxDist: number;
  maxPerNode: number;
  maxSegments: number;
  /** Current global order (0…1) — structural links fade in with it. */
  order: number;
}

/**
 * Writes the current link set into segment buffers:
 *  - structural links, whose alpha fades as they stretch away from rest length
 *    (they visibly "break" when the pointer disturbs the lattice, then heal);
 *  - proximity links in the unstructured region and around the pointer.
 */
export function computeHeroLinks(
  positions: ArrayLike<number>,
  s: HeroStructure,
  hash: SpatialHash,
  halfW: number,
  halfH: number,
  opts: HeroLinkOptions,
  linkCounts: Uint8Array,
  outPositions: Float32Array,
  outAlpha: Float32Array,
  energy?: ArrayLike<number>,
): number {
  let n = 0;
  const write = (i: number, j: number, alpha: number) => {
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
  };

  if (opts.order > 0.01) {
    for (let k = 0; k < s.rest.length && n < opts.maxSegments; k++) {
      const i = s.links[k * 2];
      const j = s.links[k * 2 + 1];
      const d = Math.hypot(positions[j * 3] - positions[i * 3], positions[j * 3 + 1] - positions[i * 3 + 1]);
      const strain = Math.abs(d - s.rest[k]) / (s.rest[k] + 1);
      const integrity = clamp(1 - strain * 2.2);
      const alpha = 0.75 * opts.order * integrity * integrity * (0.4 + 0.6 * s.weights[i]);
      if (alpha > 0.02) write(i, j, alpha);
    }
  }

  const margin = 80;
  hash.build(
    positions,
    s.count,
    -halfW - margin,
    -halfH - margin,
    halfW * 2 + margin * 2,
    halfH * 2 + margin * 2,
    opts.maxDist,
  );
  linkCounts.fill(0, 0, s.count);
  hash.forEachPair(positions, opts.maxDist, (i, j, d) => {
    if (n >= opts.maxSegments) return false;
    const excite = energy ? Math.max(energy[i], energy[j]) : 0;
    const loose = Math.min(s.weights[i], s.weights[j]) < 0.55 || opts.order < 0.5;
    if (!loose && excite < 0.15) return;
    if (linkCounts[i] >= opts.maxPerNode || linkCounts[j] >= opts.maxPerNode) return;
    const t = 1 - d / opts.maxDist;
    const alpha = t * t * (0.5 + excite * 1.8);
    if (alpha < 0.03) return;
    linkCounts[i]++;
    linkCounts[j]++;
    write(i, j, alpha);
  });
  return n;
}
