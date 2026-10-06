import { useMemo, useState } from 'react';
import { m } from 'motion/react';
import { catalogue } from '@/data/catalogue';
import { buildIndex, mostSimilar } from '@/lib/tfidf';
import { cn } from '@/lib/cn';

/**
 * A working content-based recommender: TF-IDF vectors over descriptions, ranked
 * by cosine similarity — the same maths as the Netflix project, small enough to
 * inspect. Shared terms explain every recommendation.
 */
export default function TfidfDemo() {
  const index = useMemo(
    () => buildIndex(catalogue.map((t) => ({ id: t.id, text: `${t.genre} ${t.description}` }))),
    [],
  );
  const [selected, setSelected] = useState(catalogue[3].id);
  const results = useMemo(() => mostSimilar(index, selected, 5).filter((r) => r.score > 0), [index, selected]);
  const top = results[0]?.score || 1;
  const current = catalogue.find((t) => t.id === selected)!;

  return (
    <div className="border border-[var(--line-strong)] bg-paper/50 p-5 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="t-label text-ink">Live demo · TF-IDF + cosine similarity</p>
        <p className="t-label text-muted">
          {catalogue.length} titles · {index.idf.size} terms
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="radiogroup" aria-label="Choose a title">
        {catalogue.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected === t.id}
            onClick={() => setSelected(t.id)}
            className={cn(
              't-label rounded-full border px-3 py-1.5 text-[10px] transition-colors duration-300',
              selected === t.id ? 'border-ink bg-ink text-ivory' : 'border-[var(--line-strong)] hover:border-ink',
            )}
          >
            {t.title}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="t-label text-muted">Because you watched</p>
          <p className="t-h3 mt-2">{current.title}</p>
          <p className="t-label mt-2 text-accent-ink">{current.genre}</p>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-2">{current.description}</p>
        </div>
        <ol className="md:col-span-8" aria-live="polite">
          {results.map((r, i) => {
            const t = catalogue.find((c) => c.id === r.id)!;
            return (
              <li key={r.id} className="border-t border-[var(--line)] py-3.5">
                <div className="flex items-baseline justify-between gap-4">
                  <button type="button" onClick={() => setSelected(r.id)} className="text-left">
                    <span className="t-label mr-3 text-muted">0{i + 1}</span>
                    <span className="text-[1.05rem] font-medium tracking-[-0.015em] hover:underline">{t.title}</span>
                  </button>
                  <span className="t-meta text-muted">cos {r.score.toFixed(3)}</span>
                </div>
                <div className="relative mt-2 h-1 bg-ink/[0.07]">
                  <m.span
                    className={cn('absolute inset-y-0 left-0', i === 0 ? 'bg-accent' : 'bg-ink')}
                    initial={false}
                    animate={{ width: `${(r.score / top) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 170, damping: 22 }}
                  />
                </div>
                <p className="t-meta mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                  {r.shared.length ? (
                    r.shared.slice(0, 4).map((s) => (
                      <span key={s.term}>
                        <span className="text-ink">{s.term}</span> {s.contribution.toFixed(3)}
                      </span>
                    ))
                  ) : (
                    <span>no shared terms</span>
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
