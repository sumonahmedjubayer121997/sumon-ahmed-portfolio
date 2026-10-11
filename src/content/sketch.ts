/**
 * Hand-drawn sketches for the blog: a post's header diagram and inline
 * <Sketch … /> blocks. A spec is plain data (stored on the post, parsed from
 * Markdown); `layoutSketch` turns it into seeded, slightly wobbly strokes and
 * labels. The page, the admin preview and the link-preview images all use the
 * same layout, and the same spec always draws the same way, so prerendered and
 * hydrated markup match.
 */

export const sketchKinds = ['pipeline', 'cycle', 'compare', 'bar'] as const;
export type SketchKind = (typeof sketchKinds)[number];

export interface SketchSpec {
  kind: SketchKind;
  labels: string[];
  /** Bar charts only: one value per label, exactly as typed ("0.81", "92%"). */
  values?: string[];
  caption?: string;
}

export const sketchKindLabels: Record<SketchKind, string> = {
  pipeline: 'Pipeline (A → B → C)',
  cycle: 'Cycle (a loop)',
  compare: 'Compare (A vs B)',
  bar: 'Chart (your numbers)',
};

/** A chart value as typed ("0.81", "92%", "1,200") → number; NaN if it isn't one. */
export const sketchNumber = (v: string) => Number.parseFloat(v.replace(/,/g, '').replace(/[^0-9.+-]/g, ''));

export function sketchProblems(s: SketchSpec): string[] {
  const p: string[] = [];
  if (s.labels.length < 2) p.push('A sketch needs at least two labels.');
  if (s.labels.length > 6) p.push('Keep a sketch to six labels or fewer.');
  if (s.labels.some((l) => l.length > 28)) p.push('Keep each label under 28 characters.');
  if (s.kind === 'compare' && s.labels.length !== 2) p.push('A comparison takes exactly two labels.');
  if (s.kind === 'bar') {
    if (!s.values || s.values.length !== s.labels.length) p.push('Every bar needs a value, written "Label: 0.81".');
    else if (s.values.some((v) => Number.isNaN(sketchNumber(v))))
      p.push('Chart values must be numbers, like 0.81, 92% or 1,200.');
  }
  return p;
}

/** Parses `<Sketch template="pipeline" labels="A, B, C" />` or `<Sketch chart="bar" data="A: 0.62, B: 0.81" />`. */
export function parseSketchTag(tag: string): { spec: SketchSpec } | { error: string } {
  const t = tag.trim();
  if (!/^<Sketch\b[^>]*\/>$/.test(t))
    return { error: 'write sketches as <Sketch template="pipeline" labels="A, B, C" />' };
  const attrs = Object.fromEntries([...t.matchAll(/(\w+)\s*=\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]));
  const caption = attrs.caption?.trim();
  let spec: SketchSpec;
  if (attrs.chart !== undefined) {
    if (attrs.chart !== 'bar') return { error: `unknown chart “${attrs.chart}” — use chart="bar"` };
    const pairs = (attrs.data ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const at = s.lastIndexOf(':');
        return at < 0 ? [s, ''] : [s.slice(0, at).trim(), s.slice(at + 1).trim()];
      });
    spec = { kind: 'bar', labels: pairs.map((p) => p[0]), values: pairs.map((p) => p[1]) };
  } else {
    const kind = attrs.template as SketchKind | undefined;
    if (!kind || !sketchKinds.includes(kind) || kind === 'bar')
      return { error: `unknown sketch template “${kind ?? ''}” — use pipeline, cycle or compare` };
    spec = {
      kind,
      labels: (attrs.labels ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
  }
  if (caption) spec.caption = caption;
  const problems = sketchProblems(spec);
  return problems.length ? { error: problems[0] } : { spec };
}

/** What the drawing shows, for screen readers and link previews. */
export function describeSketch(s: SketchSpec): string {
  const l = s.labels;
  const text =
    s.kind === 'pipeline'
      ? `Diagram: ${l.join(' → ')}`
      : s.kind === 'cycle'
        ? `Cycle: ${l.join(' → ')} → back to ${l[0]}`
        : s.kind === 'compare'
          ? `${l[0]} compared with ${l[1]}`
          : `Bar chart: ${l.map((x, i) => `${x} ${s.values?.[i] ?? ''}`.trim()).join(', ')}`;
  return s.caption ? `${text}. ${s.caption}` : text;
}

/* ───────────────────────── Layout ───────────────────────── */

export type SketchTone = 'ink' | 'muted' | 'accent';
export interface SketchStroke {
  d: string;
  tone: SketchTone;
  width: number;
}
export interface SketchText {
  x: number;
  y: number;
  text: string;
  size: number;
  tone: SketchTone;
  anchor: 'start' | 'middle' | 'end';
}
export interface SketchLayout {
  width: number;
  height: number;
  strokes: SketchStroke[];
  texts: SketchText[];
}

type Rand = () => number;

function seeded(spec: SketchSpec): Rand {
  let h = 2166136261;
  for (const ch of JSON.stringify([spec.kind, spec.labels, spec.values ?? []]))
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => Math.round(n * 10) / 10;

/** A line drawn twice with a little wobble, like a pen going over it. */
function line(R: Rand, x1: number, y1: number, x2: number, y2: number, j = 1.4) {
  let d = '';
  for (let pass = 0; pass < 2; pass++) {
    const o = () => (R() - 0.5) * j * 2;
    d += `M${f(x1 + o())} ${f(y1 + o())}Q${f((x1 + x2) / 2 + o() * 1.6)} ${f((y1 + y2) / 2 + o() * 1.6)} ${f(x2 + o())} ${f(y2 + o())}`;
  }
  return d;
}

const box = (R: Rand, x: number, y: number, w: number, h: number) =>
  line(R, x, y, x + w, y) + line(R, x + w, y, x + w, y + h) + line(R, x + w, y + h, x, y + h) + line(R, x, y + h, x, y);

function ellipse(R: Rand, cx: number, cy: number, rx: number, ry: number) {
  let d = '';
  for (let pass = 0; pass < 2; pass++) {
    const start = R() * Math.PI * 2;
    for (let i = 0; i <= 24; i++) {
      const a = start + (i / 24) * Math.PI * 2.08;
      const w = 1 + (R() - 0.5) * 0.06;
      d += `${i ? 'L' : 'M'}${f(cx + Math.cos(a) * rx * w)} ${f(cy + Math.sin(a) * ry * w)}`;
    }
  }
  return d;
}

function arrow(R: Rand, x1: number, y1: number, x2: number, y2: number) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 9;
  return (
    line(R, x1, y1, x2, y2) +
    line(R, x2, y2, x2 - h * Math.cos(a - 0.45), y2 - h * Math.sin(a - 0.45), 0.8) +
    line(R, x2, y2, x2 - h * Math.cos(a + 0.45), y2 - h * Math.sin(a + 0.45), 0.8)
  );
}

/** Caveat is narrow: about 0.43 em per character. Long labels wrap onto two lines. */
function fitLabel(text: string, maxWidth: number, maxSize: number): { lines: string[]; size: number } {
  const size1 = Math.min(maxSize, maxWidth / (text.length * 0.43));
  const space = text.indexOf(' ') > 0;
  if (size1 >= maxSize * 0.72 || !space) return { lines: [text], size: Math.max(12, size1) };
  const words = text.split(' ');
  let best = [text, ''];
  let bestLen = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    if (Math.max(a.length, b.length) < bestLen) {
      bestLen = Math.max(a.length, b.length);
      best = [a, b];
    }
  }
  return { lines: best, size: Math.max(12, Math.min(maxSize, maxWidth / (bestLen * 0.43))) };
}

function label(
  texts: SketchText[],
  x: number,
  y: number,
  text: string,
  maxW: number,
  maxSize: number,
  tone: SketchTone,
) {
  const { lines, size } = fitLabel(text, maxW, maxSize);
  lines.forEach((l, i) =>
    texts.push({
      x: f(x),
      y: f(y + (i - (lines.length - 1) / 2) * size * 0.95),
      text: l,
      size: f(size),
      tone,
      anchor: 'middle',
    }),
  );
}

export function layoutSketch(spec: SketchSpec): SketchLayout {
  const R = seeded(spec);
  const strokes: SketchStroke[] = [];
  const texts: SketchText[] = [];
  const add = (d: string, tone: SketchTone = 'ink', width = 1.7) => strokes.push({ d, tone, width });
  const L = spec.labels;
  const W = 640;

  if (spec.kind === 'pipeline') {
    const n = L.length;
    const gap = 34;
    const w = (W - 40 - gap * (n - 1)) / n;
    L.forEach((text, i) => {
      const x = 20 + i * (w + gap);
      const last = i === n - 1;
      add(box(R, x, 52, w, 84), last ? 'accent' : 'ink', last ? 2.2 : 1.7);
      label(texts, x + w / 2, 94, text, w - 14, 30, last ? 'accent' : 'ink');
      if (!last) add(arrow(R, x + w + 5, 94, x + w + gap - 5, 94), 'muted', 1.4);
    });
    return { width: W, height: 188, strokes, texts };
  }

  if (spec.kind === 'cycle') {
    const n = L.length;
    const cx = W / 2;
    const cy = 112;
    const rx = n === 2 ? 180 : 220;
    const ry = n === 2 ? 0 : 66;
    const pos = L.map((_, i) => {
      const a = n === 2 ? Math.PI * i : -Math.PI / 2 + (i / n) * Math.PI * 2;
      return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, a };
    });
    pos.forEach((p, i) => {
      const first = i === 0;
      add(ellipse(R, p.x, p.y, 62, 34), first ? 'accent' : 'ink', first ? 2.2 : 1.7);
      label(texts, p.x, p.y, L[i], 108, 26, first ? 'accent' : 'ink');
    });
    pos.forEach((p, i) => {
      const q = pos[(i + 1) % n];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      // Leave the node outlines: shorten each arrow by roughly the ellipse radius along its direction.
      const pad = (u: number, v: number) => 1 / Math.hypot(u / 66, v / 38);
      const bend = n === 2 ? (i === 0 ? -34 : 34) : 0;
      add(
        arrow(
          R,
          p.x + ux * pad(ux, uy),
          p.y + uy * pad(ux, uy) + bend,
          q.x - ux * pad(ux, uy),
          q.y - uy * pad(ux, uy) + bend,
        ),
        'muted',
        1.4,
      );
    });
    return { width: W, height: 224, strokes, texts };
  }

  if (spec.kind === 'compare') {
    [0, 1].forEach((k) => {
      const x = k ? 352 : 18;
      const tone: SketchTone = k ? 'accent' : 'ink';
      add(box(R, x, 26, 270, 136), tone, k ? 2.1 : 1.7);
      label(texts, x + 135, 58, L[k], 240, 30, tone);
      for (let r = 0; r < 3; r++) {
        const y = 92 + r * 20;
        add(
          line(R, x + 26, y, x + 26 + (k ? 210 - r * 30 : 150 - r * 40) * (0.8 + R() * 0.2), y, 2.2),
          k ? 'accent' : 'muted',
          1.3,
        );
      }
    });
    texts.push({ x: W / 2, y: 96, text: 'vs', size: 30, tone: 'muted', anchor: 'middle' });
    return { width: W, height: 188, strokes, texts };
  }

  // Bar chart: values as typed, lengths to scale (0–1 for scores, else 0–max).
  const values = (spec.values ?? []).map(sketchNumber);
  const max = Math.max(...values);
  const scale = values.every((v) => v >= 0 && v <= 1) ? 1 : max * 1.08 || 1;
  const top = 26;
  const row = 54;
  const x0 = 196;
  const span = 340;
  add(line(R, x0, top - 8, x0, top + L.length * row - 6, 1.2), 'ink', 1.5);
  L.forEach((text, i) => {
    const y = top + i * row;
    const w = Math.max(6, (values[i] / scale) * span);
    const best = values[i] === max;
    const tone: SketchTone = best ? 'accent' : 'ink';
    add(box(R, x0, y, w, 30), tone, best ? 2 : 1.6);
    for (let k = 0; k < Math.floor(w / 14); k++) {
      const hx = x0 + 8 + k * 14;
      add(line(R, hx, y + 26, hx + 9, y + 4, 0.7), best ? 'accent' : 'muted', 1);
    }
    const { lines, size } = fitLabel(text, 168, 26);
    lines.forEach((l, li) =>
      texts.push({
        x: x0 - 14,
        y: f(y + 15 + (li - (lines.length - 1) / 2) * size * 0.95),
        text: l,
        size: f(size),
        tone: 'ink',
        anchor: 'end',
      }),
    );
    texts.push({ x: f(x0 + w + 14), y: y + 15, text: spec.values?.[i] ?? '', size: 28, tone, anchor: 'start' });
  });
  return { width: W, height: top + L.length * row + 8, strokes, texts };
}
