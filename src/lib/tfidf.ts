import { STOPWORDS, lemmatize, normalise } from './nlp';

export type Vector = Map<string, number>;

export interface TfidfIndex {
  ids: string[];
  vectors: Map<string, Vector>;
  idf: Map<string, number>;
}

export function terms(text: string) {
  return normalise(text)
    .split(' ')
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map(lemmatize);
}

/**
 * TF-IDF with smoothed IDF (scikit-learn's default) and L2-normalised vectors,
 * so a dot product is exactly cosine similarity.
 *   tf(t, d)  = count(t, d) / |d|
 *   idf(t)    = ln((1 + N) / (1 + df(t))) + 1
 */
export function buildIndex(docs: Array<{ id: string; text: string }>): TfidfIndex {
  const tokenised = docs.map((d) => ({ id: d.id, tokens: terms(d.text) }));
  const df = new Map<string, number>();
  for (const d of tokenised) for (const t of new Set(d.tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  const N = docs.length;
  const idf = new Map<string, number>();
  for (const [t, n] of df) idf.set(t, Math.log((1 + N) / (1 + n)) + 1);

  const vectors = new Map<string, Vector>();
  for (const d of tokenised) {
    const v: Vector = new Map();
    for (const t of d.tokens) v.set(t, (v.get(t) ?? 0) + 1 / d.tokens.length);
    let norm = 0;
    for (const [t, tf] of v) {
      const w = tf * idf.get(t)!;
      v.set(t, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [t, w] of v) v.set(t, w / norm);
    vectors.set(d.id, v);
  }
  return { ids: docs.map((d) => d.id), vectors, idf };
}

export interface Neighbour {
  id: string;
  score: number;
  /** Terms contributing to the similarity, largest contribution first. */
  shared: Array<{ term: string; contribution: number }>;
}

export function mostSimilar(index: TfidfIndex, id: string, k = 5): Neighbour[] {
  const q = index.vectors.get(id);
  if (!q) return [];
  const out: Neighbour[] = [];
  for (const other of index.ids) {
    if (other === id) continue;
    const v = index.vectors.get(other)!;
    let score = 0;
    const shared: Neighbour['shared'] = [];
    for (const [t, w] of q) {
      const w2 = v.get(t);
      if (w2) {
        score += w * w2;
        shared.push({ term: t, contribution: w * w2 });
      }
    }
    shared.sort((a, b) => b.contribution - a.contribution);
    out.push({ id: other, score, shared });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, k);
}
