import { useMemo, useState } from 'react';
import { research } from '@/content';
import { analyse } from '@/lib/nlp';
import { cn } from '@/lib/cn';

/**
 * Type any sentence and watch the preprocessing pipeline from the dissertation
 * run on it: normalisation, tokens, stop-words, lemmas, negation-aware lexicon
 * sentiment and simple linguistic markers.
 */
export default function PreprocessDemo() {
  const [text, setText] = useState(research.sample);
  const a = useMemo(() => analyse(text), [text]);
  const negations = a.tokens.filter((t) => t.negated).length;
  const gauge = (a.compound + 1) / 2;

  return (
    <div className="border border-[var(--line-strong)] bg-paper/50 p-5 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <label htmlFor="pre-input" className="t-label text-ink">
          Live demo · NLP preprocessing
        </label>
        <button type="button" onClick={() => setText(research.sample)} className="t-label text-muted hover:text-ink">
          Reset sample
        </button>
      </div>
      <textarea
        id="pre-input"
        value={text}
        maxLength={280}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="mt-4 w-full resize-none border border-[var(--line-strong)] bg-ivory p-4 text-[1rem] leading-relaxed outline-none focus-visible:border-ink"
      />

      <ol className="mt-6 grid gap-6 md:grid-cols-2">
        <li>
          <p className="t-label text-muted">01 — Normalised</p>
          <p className="t-meta mt-2 break-words text-[12px] text-ink">{a.normalised || '—'}</p>
        </li>
        <li>
          <p className="t-label text-muted">02 — Tokens · stop-words removed · lemmas</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {a.tokens.map((t, i) => (
              <span
                key={i}
                className={cn(
                  't-meta rounded-sm px-1.5 py-0.5 text-[11px]',
                  t.stop ? 'text-muted line-through' : 'bg-ink/[0.06] text-ink',
                  t.valence < 0 && !t.stop && 'bg-accent/15',
                )}
                title={t.stop ? 'stop-word' : t.lemma !== t.raw ? `${t.raw} → ${t.lemma}` : undefined}
              >
                {t.stop ? t.raw : t.lemma}
              </span>
            ))}
          </div>
        </li>
        <li>
          <p className="t-label text-muted">03 — Lexicon sentiment</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="t-meta w-8 text-[11px] text-muted">−1</span>
            <span className="relative h-1.5 flex-1 bg-gradient-to-r from-accent/40 via-ink/10 to-ink/40">
              <span
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ivory bg-ink transition-[left] duration-500"
                style={{ left: `${gauge * 100}%` }}
              />
            </span>
            <span className="t-meta w-8 text-right text-[11px] text-muted">+1</span>
          </div>
          <p className="t-label mt-3 text-ink">
            compound <span className={a.compound < -0.05 ? 'text-accent-ink' : ''}>{a.compound.toFixed(2)}</span>
          </p>
        </li>
        <li>
          <p className="t-label text-muted">04 — Markers</p>
          <dl className="t-meta mt-2 grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <dt className="text-muted">tokens</dt>
              <dd className="text-[1.1rem] text-ink">{a.tokens.length}</dd>
            </div>
            <div>
              <dt className="text-muted">negated</dt>
              <dd className="text-[1.1rem] text-ink">{negations}</dd>
            </div>
            <div>
              <dt className="text-muted">1st person</dt>
              <dd className="text-[1.1rem] text-ink">{(a.firstPerson * 100).toFixed(0)}%</dd>
            </div>
          </dl>
        </li>
      </ol>
      <p className="t-label mt-8 text-muted">Illustrative preprocessing only — not a diagnostic tool.</p>
    </div>
  );
}
