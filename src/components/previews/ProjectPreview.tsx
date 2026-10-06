import { memo, useMemo } from 'react';
import type { PreviewKind } from '@/data/projects';
import { createRandom } from '@/lib/random';
import { cn } from '@/lib/cn';

/**
 * Generative, data-honest preview artifacts for each project — drawn from the
 * kind of output the project produces, never stock imagery.
 */
export const ProjectPreview = memo(function ProjectPreview({
  kind,
  className,
  tone = 'light',
}: {
  kind: PreviewKind;
  className?: string;
  tone?: 'light' | 'dark';
}) {
  const ink = tone === 'dark' ? '#ECE8DF' : '#151413';
  const accent = '#F28C28';
  return (
    <svg viewBox="0 0 240 160" className={cn('block h-auto w-full', className)} aria-hidden="true">
      {kind === 'sentiment' && <Sentiment ink={ink} accent={accent} />}
      {kind === 'similarity' && <Similarity ink={ink} accent={accent} />}
      {kind === 'retrieval' && <Retrieval ink={ink} accent={accent} />}
      {kind === 'interface' && <Interface ink={ink} accent={accent} />}
    </svg>
  );
});

type Colors = { ink: string; accent: string };

/** Sentiment over a sequence of posts; the sustained dip below threshold is the early signal. */
function Sentiment({ ink, accent }: Colors) {
  const pts = useMemo(() => {
    const r = createRandom(4);
    return Array.from({ length: 40 }, (_, i) => {
      const t = i / 39;
      const drift = 0.35 * Math.sin(t * 5.2) - (t > 0.55 ? (t - 0.55) * 1.9 : 0);
      return { x: 16 + t * 208, y: 74 - (drift + (r.next() - 0.5) * 0.35) * 46 };
    });
  }, []);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
  return (
    <g fill="none" strokeWidth="1">
      <path d="M16 20V136H224" stroke={ink} strokeOpacity="0.25" />
      <path d="M16 92H224" stroke={ink} strokeOpacity="0.35" strokeDasharray="2 3" />
      <rect x="132" y="92" width="92" height="44" fill={accent} fillOpacity="0.1" />
      <path d={d} stroke={ink} strokeOpacity="0.85" />
      {pts.map((p, i) => (p.y > 92 ? <circle key={i} cx={p.x} cy={p.y} r="1.8" fill={accent} stroke="none" /> : null))}
      <text x="18" y="150" fill={ink} fillOpacity="0.55" fontSize="7" fontFamily="JetBrains Mono Variable, monospace">
        POLARITY · 40 POSTS
      </text>
      <text x="190" y="88" fill={ink} fillOpacity="0.55" fontSize="7" fontFamily="JetBrains Mono Variable, monospace">
        τ = −0.3
      </text>
    </g>
  );
}

/** Cosine-similarity matrix with one title's row of neighbours highlighted. */
function Similarity({ ink, accent }: Colors) {
  const cells = useMemo(() => {
    const r = createRandom(9);
    const n = 9;
    const groups = [0, 0, 0, 1, 1, 2, 2, 2, 1];
    const out: { x: number; y: number; v: number }[] = [];
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const base = i === j ? 1 : groups[i] === groups[j] ? 0.55 + r.next() * 0.3 : r.next() * 0.25;
        out.push({ x: j, y: i, v: base });
      }
    return out;
  }, []);
  const size = 13;
  const ox = 62;
  const oy = 14;
  return (
    <g>
      {cells.map((c, k) => (
        <rect
          key={k}
          x={ox + c.x * size}
          y={oy + c.y * size}
          width={size - 1.5}
          height={size - 1.5}
          fill={c.y === 2 && c.x !== 2 && c.v > 0.5 ? accent : ink}
          fillOpacity={c.y === 2 && c.x !== 2 && c.v > 0.5 ? 0.9 : c.v * 0.8 + 0.04}
        />
      ))}
      <rect
        x={ox - 2}
        y={oy + 2 * size - 2}
        width={9 * size + 2.5}
        height={size + 2.5}
        fill="none"
        stroke={accent}
        strokeWidth="1"
      />
      <text x="62" y="148" fill={ink} fillOpacity="0.55" fontSize="7" fontFamily="JetBrains Mono Variable, monospace">
        COS(θ) · TF-IDF · 9 × 9
      </text>
    </g>
  );
}

/** Embedding space: a query vector and its k nearest neighbours. */
function Retrieval({ ink, accent }: Colors) {
  const data = useMemo(() => {
    const r = createRandom(15);
    const q = { x: 132, y: 70 };
    const pts = Array.from({ length: 70 }, () => ({ x: 14 + r.next() * 212, y: 12 + r.next() * 118 }));
    const ranked = [...pts].sort((a, b) => Math.hypot(a.x - q.x, a.y - q.y) - Math.hypot(b.x - q.x, b.y - q.y));
    return { q, pts, knn: ranked.slice(0, 5), radius: Math.hypot(ranked[4].x - q.x, ranked[4].y - q.y) + 3 };
  }, []);
  return (
    <g strokeWidth="1">
      {data.pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="1.6" fill={ink} fillOpacity="0.4" />
      ))}
      <circle
        cx={data.q.x}
        cy={data.q.y}
        r={data.radius}
        fill="none"
        stroke={ink}
        strokeOpacity="0.35"
        strokeDasharray="2 3"
      />
      {data.knn.map((p, i) => (
        <g key={i}>
          <line x1={data.q.x} y1={data.q.y} x2={p.x} y2={p.y} stroke={accent} strokeOpacity="0.8" />
          <circle cx={p.x} cy={p.y} r="2.4" fill={ink} />
        </g>
      ))}
      <circle cx={data.q.x} cy={data.q.y} r="3.4" fill={accent} />
      <text x="14" y="150" fill={ink} fillOpacity="0.55" fontSize="7" fontFamily="JetBrains Mono Variable, monospace">
        QUERY · TOP-K = 5 · ℝ¹⁵³⁶
      </text>
    </g>
  );
}

/** Interface wireframe: the layer where models meet people. */
function Interface({ ink, accent }: Colors) {
  return (
    <g fill="none" stroke={ink} strokeWidth="1">
      <rect x="20" y="14" width="200" height="124" strokeOpacity="0.5" />
      <path d="M20 28H220" strokeOpacity="0.3" />
      <circle cx="28" cy="21" r="1.6" fill={ink} fillOpacity="0.4" stroke="none" />
      <circle cx="34" cy="21" r="1.6" fill={ink} fillOpacity="0.4" stroke="none" />
      <path d="M32 44H118M32 52H96" strokeOpacity="0.7" />
      <path d="M32 64H108M32 70H100M32 76H112" strokeOpacity="0.25" />
      <rect x="32" y="90" width="40" height="12" rx="6" fill={ink} fillOpacity="0.85" stroke="none" />
      <g strokeOpacity="0.4">
        <path d="M140 60 162 46M140 60 162 74M162 46 186 60M162 74 186 60M162 46 162 74M186 60 204 88" />
      </g>
      <circle cx="140" cy="60" r="2" fill={ink} stroke="none" />
      <circle cx="162" cy="46" r="2" fill={ink} stroke="none" />
      <circle cx="162" cy="74" r="2" fill={ink} stroke="none" />
      <circle cx="186" cy="60" r="2.6" fill={accent} stroke="none" />
      <circle cx="204" cy="88" r="2" fill={ink} stroke="none" />
      <path d="M128 112H208" strokeOpacity="0.25" />
      <path d="M128 112H176" stroke={accent} />
      <text
        x="20"
        y="152"
        fill={ink}
        fillOpacity="0.55"
        stroke="none"
        fontSize="7"
        fontFamily="JetBrains Mono Variable, monospace"
      >
        REACT · TS · WEBGL
      </text>
    </g>
  );
}
