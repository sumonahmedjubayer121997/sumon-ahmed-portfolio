import { createRandom } from '../lib/random';
import type { ConceptId } from './schema';

/**
 * The geometric visual language for projects: one shape per concept, used for
 * project covers, concept nodes on the project map, concept tags and skill
 * groups. Pure geometry (no React) so the site, the admin and link previews
 * draw the same thing.
 *
 *   data = circle · ml = half circle · llm = quarter circle
 *   rag = nested square · ai = triangle · software = stepped bars
 */
export const conceptShapeNames: Record<ConceptId, string> = {
  data: 'circle',
  ml: 'half circle',
  llm: 'quarter circle',
  rag: 'nested square',
  ai: 'triangle',
  software: 'bars',
};

export type CoverFill = 'ink' | 'accent';
export interface ShapePart {
  d: string;
  /** Filled solid, or drawn as an outline. */
  mode: 'fill' | 'stroke';
  /** Use the shape's colour, or the ink colour regardless (outlines on accent shapes). */
  tone: 'own' | 'ink';
  opacity?: number;
}

const f = (n: number) => Math.round(n * 10) / 10;

/** The shape for a concept, centred on 0,0, about `s` across. */
export function conceptShape(concept: ConceptId, s: number): ShapePart[] {
  const r = s / 2;
  switch (concept) {
    case 'data':
      return [{ d: `M${-r} 0A${r} ${r} 0 1 0 ${r} 0A${r} ${r} 0 1 0 ${-r} 0Z`, mode: 'fill', tone: 'own' }];
    case 'ml':
      return [
        { d: `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}Z`, mode: 'fill', tone: 'own' },
        { d: `M0 ${-r}A${r} ${r} 0 0 0 0 ${r}`, mode: 'stroke', tone: 'ink' },
      ];
    case 'llm':
      return [
        {
          d: `M${f(-r * 0.8)} ${f(r * 0.8)}V${f(-r * 0.8)}A${f(r * 1.6)} ${f(r * 1.6)} 0 0 1 ${f(r * 0.8)} ${f(r * 0.8)}Z`,
          mode: 'fill',
          tone: 'own',
        },
      ];
    case 'rag': {
      const o = r * 0.8;
      const i = r * 0.3;
      return [
        { d: `M${f(-o)} ${f(-o)}H${f(o)}V${f(o)}H${f(-o)}Z`, mode: 'stroke', tone: 'own' },
        { d: `M${f(-i)} ${f(-i)}H${f(i)}V${f(i)}H${f(-i)}Z`, mode: 'fill', tone: 'own' },
      ];
    }
    case 'ai':
      return [{ d: `M0 ${f(-r * 0.92)}L${f(r * 0.86)} ${f(r * 0.66)}H${f(-r * 0.86)}Z`, mode: 'fill', tone: 'own' }];
    case 'software': {
      const w = s * 0.2;
      return [0, 1, 2].map((k) => {
        const x = -r * 0.8 + k * s * 0.3;
        const top = -r * 0.8 + k * s * 0.22;
        return {
          d: `M${f(x)} ${f(top)}H${f(x + w)}V${f(r * 0.8)}H${f(x)}Z`,
          mode: 'fill' as const,
          tone: (k === 2 ? 'own' : 'ink') as 'own' | 'ink',
          opacity: k === 2 ? 1 : 0.86,
        };
      });
    }
  }
}

export interface CoverShape {
  concept: ConceptId;
  x: number;
  y: number;
  size: number;
  rotate: number;
  fill: CoverFill;
}
export interface CoverLayout {
  width: number;
  height: number;
  shapes: CoverShape[];
  /** A thin structural line and ring that tie the composition together. */
  baseline: { y: number };
  ring: { x: number; y: number; r: number };
}

/**
 * A project's cover: its concepts as large shapes, arranged by `seed` (Shuffle
 * in the admin saves a new one). The first concept is the project's main one
 * and gets the accent colour.
 */
export function layoutCover(concepts: readonly ConceptId[], seed: number): CoverLayout {
  // Documents saved before covers existed have no seed: treat it as the default, as the site's schema does.
  const rnd = createRandom((Number.isFinite(seed) ? seed : 0) * 7919 + 17);
  const W = 600;
  const H = 400;
  const cells = [
    [170, 175],
    [400, 215],
    [300, 120],
    [470, 115],
    [205, 290],
    [400, 300],
  ];
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rnd.next() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const list = (concepts.length ? concepts : (['data'] as ConceptId[])).slice(0, 6);
  const shapes = list.map((concept, i) => {
    const [x, y] = cells[i];
    const main = i === 0;
    const size = main ? rnd.range(170, 205) : rnd.range(95, 140) * (list.length > 3 ? 0.85 : 1);
    return {
      concept,
      x: f(x + rnd.range(-18, 18)),
      y: f(y + rnd.range(-14, 14)),
      size: f(size),
      rotate: [0, 90, 180, 270][Math.floor(rnd.next() * 4)],
      fill: (main ? 'accent' : 'ink') as CoverFill,
    };
  });
  return {
    width: W,
    height: H,
    shapes,
    baseline: { y: f(rnd.range(352, 368)) },
    ring: { x: f(rnd.range(60, 540)), y: f(rnd.range(60, 120)), r: f(rnd.range(18, 30)) },
  };
}
