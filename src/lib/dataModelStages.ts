import { classShares } from '@/data/dataModel';
import { smoothstep } from './math';
import type { Random } from './random';

/**
 * Per-particle targets for the four stages of the Data → Model story.
 * Pure TypeScript so the static fallback draws the same shapes.
 *
 *   0 RAW DATA    uniform noise in a box
 *   1 FEATURES    four overlapping gaussian clusters in feature space
 *   2 MODEL       clusters pulled apart and ordered into lattice balls
 *   3 PREDICTION  unit charts (waffles) — countable groups, one per class
 */
export interface ModelTargets {
  count: number;
  classes: Uint8Array;
  stages: [Float32Array, Float32Array, Float32Array, Float32Array];
  delays: Float32Array;
  sizes: Float32Array;
  seeds: Float32Array;
  /** Local-space anchor above each prediction group, for labels. */
  labelAnchors: Array<[number, number, number]>;
  classCounts: number[];
}

const C1: Array<[number, number, number]> = [
  [-120, 70, 60],
  [125, 85, -60],
  [105, -95, 70],
  [-130, -85, -50],
];
const C2: Array<[number, number, number]> = [
  [-170, 100, 40],
  [175, 110, -50],
  [155, -115, 60],
  [-175, -105, -40],
];

export function buildModelTargets(count: number, random: Random): ModelTargets {
  const classes = new Uint8Array(count);
  const delays = new Float32Array(count);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  const stages = [0, 1, 2, 3].map(() => new Float32Array(count * 3)) as ModelTargets['stages'];

  // Deterministic class assignment matching the declared shares.
  const classCounts = classShares.map((s) => Math.round(s * count));
  classCounts[0] += count - classCounts.reduce((a, b) => a + b, 0);
  let k = 0;
  classCounts.forEach((n, c) => {
    for (let i = 0; i < n; i++) classes[k++] = c;
  });
  // Shuffle so classes are interleaved in the buffer (staggered transitions look organic).
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1));
    [classes[i], classes[j]] = [classes[j], classes[i]];
  }

  const rankInClass = new Uint16Array(count);
  const seen = [0, 0, 0, 0];
  for (let i = 0; i < count; i++) rankInClass[i] = seen[classes[i]]++;

  const cols = count > 700 ? 14 : 9;
  const gap = 9;
  const groupSpacing = cols * gap + 52;
  const baseY = -140;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const labelAnchors: ModelTargets['labelAnchors'] = [];

  for (let c = 0; c < 4; c++) {
    const rows = Math.ceil(classCounts[c] / cols);
    labelAnchors.push([(c - 1.5) * groupSpacing - (cols * gap) / 2, baseY + rows * gap + 18, 0]);
  }

  for (let i = 0; i < count; i++) {
    const c = classes[i];
    const r = rankInClass[i];
    const n = classCounts[c];
    delays[i] = random.next();
    seeds[i] = random.next() * 100;
    sizes[i] = 2.6 + random.next() * 1.6;

    // 0 — raw data
    stages[0].set([random.range(-300, 300), random.range(-190, 190), random.range(-170, 170)], i * 3);

    // 1 — features: overlapping gaussians
    stages[1].set(
      [C1[c][0] + random.gaussian() * 72, C1[c][1] + random.gaussian() * 62, C1[c][2] + random.gaussian() * 70],
      i * 3,
    );

    // 2 — model: ordered balls (fibonacci directions, volume-uniform radii)
    const R = 30 + 34 * Math.sqrt(n / 300);
    const t = (r + 0.5) / n;
    const radius = R * Math.cbrt(t);
    const y = 1 - 2 * t;
    const ring = Math.sqrt(1 - y * y);
    const theta = golden * r;
    stages[2].set(
      [C2[c][0] + Math.cos(theta) * ring * radius, C2[c][1] + y * radius, C2[c][2] + Math.sin(theta) * ring * radius],
      i * 3,
    );

    // 3 — prediction: unit chart per class, bottom-aligned like bars
    const col = r % cols;
    const row = Math.floor(r / cols);
    stages[3].set([(c - 1.5) * groupSpacing + (col - (cols - 1) / 2) * gap, baseY + row * gap, 0], i * 3);
  }

  return { count, classes, stages, delays, sizes, seeds, labelAnchors, classCounts };
}

/**
 * Maps pinned scroll progress (0…1) to a continuous stage value (0…3) with
 * holds, so each stage rests on screen before the next transition.
 */
export function stageValue(p: number) {
  const holds = [
    [0, 0.1],
    [0.3, 0.4],
    [0.6, 0.7],
    [0.9, 1],
  ];
  for (let i = 0; i < 3; i++) {
    const [, holdEnd] = holds[i];
    const [nextStart] = holds[i + 1];
    if (p <= holdEnd) return i;
    if (p < nextStart) return i + smoothstep(holdEnd, nextStart, p);
  }
  return 3;
}
