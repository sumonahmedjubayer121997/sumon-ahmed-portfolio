import { CORE_ID, labLinks, labNodes } from '@/data/aiLab';
import { TAU } from './math';

export type Vec3 = [number, number, number];

/**
 * Home positions for the AI Lab system: the LLM at the origin, components on a
 * tilted ellipse (wide on desktop, tall on mobile). Shared by the WebGL scene
 * and the SVG fallback.
 */
export function labLayout(compact: boolean): Record<string, Vec3> {
  const out: Record<string, Vec3> = { [CORE_ID]: [0, 0, 0] };
  const sats = labNodes.filter((n) => n.id !== CORE_ID);
  const rx = compact ? 1.6 : 3.6;
  const ry = compact ? 2.55 : 1.85;
  sats.forEach((n, i) => {
    const a = Math.PI / 2 - (i * TAU) / sats.length;
    out[n.id] = [Math.cos(a) * rx, Math.sin(a) * ry, Math.sin(a + 0.8) * 0.9];
  });
  return out;
}

/** Ids directly connected to `id`. */
export function neighbours(id: string): string[] {
  const out: string[] = [];
  for (const l of labLinks) {
    if (l.a === id) out.push(l.b);
    else if (l.b === id) out.push(l.a);
  }
  return out;
}

/** Quadratic bezier control point that bows a link away from the system centre. */
export function controlPoint(a: Vec3, b: Vec3, out: Vec3): Vec3 {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const mz = (a[2] + b[2]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular in the XY plane, oriented away from the origin.
  let px = -dy / len;
  let py = dx / len;
  if (px * mx + py * my < 0) {
    px = -px;
    py = -py;
  }
  const bow = 0.14 * len;
  out[0] = mx + px * bow;
  out[1] = my + py * bow;
  out[2] = mz;
  return out;
}

export function bezier(a: Vec3, c: Vec3, b: Vec3, t: number, out: Vec3): Vec3 {
  const u = 1 - t;
  out[0] = u * u * a[0] + 2 * u * t * c[0] + t * t * b[0];
  out[1] = u * u * a[1] + 2 * u * t * c[1] + t * t * b[1];
  out[2] = u * u * a[2] + 2 * u * t * c[2] + t * t * b[2];
  return out;
}

/** Extents the scene camera fits (world units). */
export const labExtents = (compact: boolean) => (compact ? { halfW: 2.5, halfH: 3.5 } : { halfW: 5.2, halfH: 2.85 });

/** Orthographic approximation of the scene's projection — for initial label placement and the SVG fallback. */
export function projectLayout2D(layout: Record<string, Vec3>, width: number, height: number, compact: boolean) {
  const { halfW, halfH } = labExtents(compact);
  const scale = Math.min(width / (2 * halfW), height / (2 * halfH));
  const out: Record<string, [number, number]> = {};
  for (const [id, p] of Object.entries(layout)) out[id] = [width / 2 + p[0] * scale, height / 2 - p[1] * scale];
  return { points: out, scale };
}
