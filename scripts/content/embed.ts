/**
 * Build step after the content pull: the embedding map.
 *
 *   tsx scripts/content/embed.ts
 *
 * Splits the site's writing into passages (project summaries and approach
 * steps, blog sections, research abstract, about, experience, skills), embeds
 * each locally with all-MiniLM-L6-v2 (transformers.js, no API key; the model is
 * downloaded once and cached), finds every passage's nearest neighbours by
 * cosine similarity, and lays the passages out in 3D with UMAP (seeded, so the
 * map is stable between builds). Writes src/generated/embedding-map.json, which
 * only the /map page loads.
 *
 * The result is cached by content hash. If the model can't be loaded (offline),
 * the last map is kept, or an empty one is written — the map is never what
 * breaks a build.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UMAP } from 'umap-js';
import type { Block } from '../../src/content/markdown';
import { stripInline } from '../../src/content/markdown';
import type { ContentBundle } from '../../src/content/schema';

const MODEL = 'Xenova/all-MiniLM-L6-v2';
const SEED = 42;
const NEIGHBOURS = 3;
/** Bump when the layout code changes, to invalidate cached maps. */
const LAYOUT_VERSION = 2;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outFile = resolve(root, 'src/generated/embedding-map.json');
const cacheDir = resolve(root, 'node_modules/.cache/embedding-map');

export type PassageKind = 'project' | 'post' | 'research' | 'about' | 'experience' | 'skills';

interface Passage {
  kind: PassageKind;
  /** Page or entry the passage belongs to. */
  title: string;
  section: string;
  text: string;
  href: string;
}

/* ───────────────────────── Passages ───────────────────────── */

const clean = (s: string) => stripInline(s).replace(/\s+/g, ' ').trim();

function passages(content: ContentBundle, bodies: Record<string, Block[]>): Passage[] {
  const out: Passage[] = [];
  const add = (p: Passage) => {
    const text = clean(p.text);
    if (text.length >= 40) out.push({ ...p, text });
  };

  for (const p of content.projects) {
    const href = `/work/${p.slug}`;
    add({ kind: 'project', title: p.title, section: 'Overview', text: `${p.summary} ${p.problem}`, href });
    for (const a of p.approach) add({ kind: 'project', title: p.title, section: a.title, text: a.body, href });
    for (const d of p.decisions) add({ kind: 'project', title: p.title, section: d.title, text: d.body, href });
  }

  for (const post of content.posts) {
    const blocks = bodies[post.slug] ?? [];
    let section = 'Introduction';
    let anchor = '';
    let buf: string[] = [];
    const flush = () => {
      add({
        kind: 'post',
        title: post.title,
        section,
        text: buf.join(' '),
        href: `/blog/${post.slug}${anchor ? `#${anchor}` : ''}`,
      });
      buf = [];
    };
    for (const b of blocks) {
      if (b.type === 'h2') {
        flush();
        section = b.text;
        anchor = b.id;
      } else if (b.type === 'p' || b.type === 'quote' || b.type === 'callout') buf.push(b.text);
      else if (b.type === 'list') buf.push(b.items.join('. '));
      else if (b.type === 'h3') buf.push(`${b.text}.`);
    }
    flush();
  }

  const r = content.research;
  r.abstract.forEach((text, i) =>
    add({ kind: 'research', title: r.title, section: i === 0 ? 'Abstract' : 'Method', text, href: '/#research' }),
  );
  add({ kind: 'research', title: r.title, section: 'Ethics', text: r.ethics, href: '/#research' });

  const about = content.site.about;
  add({ kind: 'about', title: 'About', section: about.heading, text: about.paragraphs.join(' '), href: '/#about' });

  for (const m of content.experience)
    add({
      kind: 'experience',
      title: m.title,
      section: `${m.year} · ${m.context}`,
      text: m.body,
      href: '/#experience',
    });

  for (const g of content.skills)
    add({
      kind: 'skills',
      title: g.label,
      section: 'Skills',
      text: `${g.note} ${g.items.join(', ')}.`,
      href: '/#skills',
    });

  return out;
}

/* ───────────────────────── Maths ───────────────────────── */

/** Seeded PRNG (mulberry32) so UMAP lays the map out the same way every build. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

/**
 * Centre on the mean and scale so 85% of points sit within radius 1; points
 * farther out are drawn in (r → 1 + (r − 1) · 0.35) so one outlier can't shrink
 * the whole map. Display only — neighbours and similarities use the vectors.
 */
function normalise(points: number[][]) {
  const mean = [0, 1, 2].map((k) => points.reduce((s, p) => s + p[k], 0) / points.length);
  const centred = points.map((p) => p.map((v, k) => v - mean[k]));
  const radii = centred.map((p) => Math.hypot(...p)).sort((a, b) => a - b);
  const scale = radii[Math.floor((radii.length - 1) * 0.85)] || 1;
  return centred.map((p) => {
    const r = Math.hypot(...p) / scale;
    const k = r > 1 ? (1 + (r - 1) * 0.35) / r : 1;
    return p.map((v) => Math.round((v / scale) * k * 1000) / 1000);
  });
}

/* ───────────────────────── Main ───────────────────────── */

async function embed(texts: string[]) {
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = resolve(root, 'node_modules/.cache/transformers');
  const extractor = await pipeline('feature-extraction', MODEL, { dtype: 'q8' });
  const out = await extractor(texts, { pooling: 'mean', normalize: true });
  return out.tolist() as number[][];
}

async function main() {
  const content: ContentBundle = JSON.parse(readFileSync(resolve(root, 'src/generated/content.json'), 'utf8'));
  const bodies: Record<string, Block[]> = JSON.parse(readFileSync(resolve(root, 'src/generated/posts.json'), 'utf8'));
  const items = passages(content, bodies);
  const inputs = items.map((p) => `${p.title}. ${p.section}. ${p.text}`.slice(0, 1200));

  const key = createHash('sha256')
    .update(JSON.stringify([MODEL, SEED, NEIGHBOURS, LAYOUT_VERSION, inputs, items.map((p) => p.href)]))
    .digest('hex')
    .slice(0, 16);
  const cached = resolve(cacheDir, `${key}.json`);
  if (existsSync(cached)) {
    writeFileSync(outFile, readFileSync(cached));
    console.log(`[map] ${items.length} passages — unchanged, reused the cached map`);
    return;
  }

  let vectors: number[][];
  try {
    const t0 = Date.now();
    vectors = await embed(inputs);
    console.log(`[map] embedded ${items.length} passages with ${MODEL} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  } catch (err) {
    console.warn(`[map] couldn't load the embedding model (${(err as Error).message}).`);
    if (!existsSync(outFile)) writeFileSync(outFile, JSON.stringify({ model: MODEL, points: [] }) + '\n');
    console.warn(existsSync(outFile) ? '[map] keeping the previous map.' : '[map] wrote an empty map.');
    return;
  }

  // Nearest neighbours by cosine similarity (vectors are unit length, so a dot product).
  const neighbours = vectors.map((v, i) =>
    vectors
      .map((w, j) => [j, dot(v, w)] as [number, number])
      .filter(([j]) => j !== i)
      .sort((a, b) => b[1] - a[1])
      .slice(0, NEIGHBOURS)
      .map(([j, s]) => [j, Math.round(s * 1000) / 1000]),
  );

  const umap = new UMAP({
    nComponents: 3,
    nNeighbors: Math.max(2, Math.min(12, items.length - 1)),
    minDist: 0.3,
    spread: 1.2,
    random: mulberry32(SEED),
    distanceFn: (a, b) => 1 - dot(a, b),
  });
  const layout = normalise(umap.fit(vectors));

  const map = {
    model: 'all-MiniLM-L6-v2',
    method: `UMAP 3D (cosine, ${NEIGHBOURS} nearest neighbours shown)`,
    points: items.map((p, i) => ({
      kind: p.kind,
      title: p.title,
      section: p.section,
      excerpt: p.text.length > 240 ? `${p.text.slice(0, 237).replace(/\s+\S*$/, '')}…` : p.text,
      href: p.href,
      p: layout[i],
      n: neighbours[i],
    })),
  };
  const json = JSON.stringify(map) + '\n';
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cached, json);
  writeFileSync(outFile, json);
  console.log(`[map] laid out ${items.length} passages in 3D`);
}

main().catch((err) => {
  console.error(`[map] ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
