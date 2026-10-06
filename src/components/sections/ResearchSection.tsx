import { useMemo } from 'react';
import { m } from 'motion/react';
import { research } from '@/content';
import { analyse } from '@/lib/nlp';
import { createRandom } from '@/lib/random';
import { cn } from '@/lib/cn';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { RevealText } from '@/components/ui/RevealText';

const ease = [0.16, 1, 0.3, 1] as const;

/** Dotted connector with a travelling particle between figure columns. */
function Connector({ vertical }: { vertical?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative block overflow-hidden',
        vertical ? 'mx-auto h-8 w-px lg:hidden' : 'mt-[2.15rem] hidden h-px w-full self-start lg:block',
      )}
    >
      <span
        className={cn(
          'absolute inset-0',
          vertical
            ? 'bg-[linear-gradient(to_bottom,var(--line-strong)_50%,transparent_50%)] bg-[length:1px_5px]'
            : 'bg-[linear-gradient(to_right,var(--line-strong)_50%,transparent_50%)] bg-[length:5px_1px]',
        )}
      />
      <span
        className={cn(
          'absolute bg-accent',
          vertical
            ? 'left-0 top-0 h-1/3 w-px [animation:flow-y_2.4s_linear_infinite]'
            : 'left-0 top-0 h-px w-1/3 [animation:flow-x_2.4s_linear_infinite]',
        )}
      />
    </span>
  );
}

/**
 * Fig. 1 — the dissertation's pipeline applied to one synthetic post. Every
 * value shown is computed live by the same preprocessing and sentiment code
 * used in the interactive demo.
 */
function ResearchFigure() {
  const a = useMemo(() => analyse(research.sample), []);
  const content = a.tokens.filter((t) => !t.stop);
  const features = useMemo(() => {
    const r = createRandom(12);
    return Array.from({ length: 40 }, () => r.next() ** 2.2);
  }, []);
  const risk = research.riskScore;

  const columns = [
    <p key="text" className="text-[0.92rem] leading-relaxed text-ink-2">
      “{research.sample}”
    </p>,
    <div key="pre" className="flex flex-wrap gap-1.5">
      {a.tokens.map((t, i) => (
        <span
          key={i}
          className={cn(
            't-meta rounded-sm px-1.5 py-0.5 text-[11px]',
            t.stop ? 'text-muted line-through decoration-muted/60' : 'bg-ink/[0.06] text-ink',
          )}
        >
          {t.stop ? t.raw : t.lemma}
        </span>
      ))}
    </div>,
    <div key="sent" className="space-y-1.5">
      {content
        .filter((t) => t.valence !== 0 || t.negated)
        .map((t, i) => (
          <div key={i} className="t-meta flex items-center gap-2 text-[11px]">
            <span className="w-16 truncate">{t.lemma}</span>
            <span className="relative h-1.5 flex-1 bg-ink/[0.06]">
              <span
                className={cn('absolute top-0 h-full', t.valence < 0 ? 'right-1/2 bg-accent' : 'left-1/2 bg-ink')}
                style={{ width: `${Math.abs(t.valence) * 50}%` }}
              />
              <span className="absolute left-1/2 top-[-2px] h-[10px] w-px bg-ink/40" />
            </span>
            <span className="w-10 text-right text-muted">{t.valence.toFixed(2)}</span>
          </div>
        ))}
      <p className="t-label pt-2 text-ink">
        compound <span className="text-accent-ink">{a.compound.toFixed(2)}</span>
      </p>
    </div>,
    <div key="feat">
      <div className="grid grid-cols-8 gap-[3px]">
        {features.map((v, i) => (
          <span key={i} className="aspect-square bg-ink" style={{ opacity: 0.06 + v * 0.8 }} />
        ))}
      </div>
      <p className="t-label mt-3 text-muted">tf-idf · polarity · 1st-person {(a.firstPerson * 100).toFixed(0)}%</p>
    </div>,
    <div key="model" className="space-y-2">
      {['Logistic Regression', 'Linear SVM', 'Random Forest'].map((name, i) => (
        <div key={name} className="flex items-center justify-between border border-[var(--line)] px-2.5 py-2">
          <span className="t-meta text-[11px]">{name}</span>
          <span className={cn('h-1.5 w-1.5 rounded-full', i === 1 ? 'bg-accent' : 'bg-ink/30')} />
        </div>
      ))}
      <p className="t-label pt-1 text-muted">stratified 5-fold CV</p>
    </div>,
    <div key="pred">
      <p className="t-label text-muted">risk signal</p>
      <p className="mt-1 text-[2.2rem] font-medium tracking-[-0.04em]">{risk.toFixed(2)}</p>
      <div className="relative mt-2 h-1.5 bg-ink/[0.08]">
        <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${risk * 100}%` }} />
        <span className="absolute left-1/2 top-[-4px] h-[14px] w-px bg-ink" />
      </div>
      <p className="t-label mt-3 text-ink">Elevated · flag for review</p>
    </div>,
  ];

  return (
    <figure>
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)_28px_minmax(0,1fr)_28px_minmax(0,1fr)_28px_minmax(0,1fr)_28px_minmax(0,1fr)] lg:items-start lg:gap-x-3">
        {columns.map((col, i) => (
          <div key={i} className="contents">
            <m.div
              className="flex min-w-0 flex-col gap-4 border-t border-ink pt-4"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -10% 0px' }}
              transition={{ duration: 0.8, ease, delay: i * 0.12 }}
            >
              <div>
                <span className="t-label text-muted">0{i + 1}</span>
                <p className="t-label mt-1 text-ink">{research.figure[i].label}</p>
                <p className="t-meta mt-0.5 text-[11px] text-muted">{research.figure[i].caption}</p>
              </div>
              {col}
            </m.div>
            {i < columns.length - 1 && (
              <>
                <Connector />
                <Connector vertical />
              </>
            )}
          </div>
        ))}
      </div>
      <figcaption className="t-label mt-10 text-muted">
        Fig. 1 — Pipeline applied to a synthetic post. Values computed live; model output illustrative.
      </figcaption>
    </figure>
  );
}

export function ResearchSection() {
  return (
    <section id="research" aria-labelledby="research-heading" className="section relative">
      <div className="shell">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <SectionLabel index="05">Research</SectionLabel>
            <RevealText
              as="h2"
              id="research-heading"
              text="Language carries signals long before anyone asks for help."
              emphasis={['signals']}
              className="t-h2 mt-8 max-w-[20ch]"
            />
          </div>
          <div className="md:col-span-4">
            <p className="t-label text-muted">{research.degree}</p>
            <p className="mt-2 text-[1.05rem]">{research.institution}</p>
          </div>
        </div>

        <article
          aria-labelledby="research-title"
          className="mt-16 border border-[var(--line-strong)] bg-paper/40 px-5 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-16"
        >
          <header className="t-label flex flex-wrap gap-x-6 gap-y-2 border-b border-[var(--line)] pb-5 text-muted">
            <span className="text-ink">Artifact</span>
            <span>{research.type}</span>
            <span>{research.institution}</span>
            <span>{research.year}</span>
          </header>

          <h3
            id="research-title"
            className="mt-10 max-w-[30ch] font-serif text-[clamp(1.9rem,3.6vw,3.4rem)] leading-[1.08] tracking-[-0.015em]"
          >
            {research.title}
          </h3>
          <p className="t-label mt-6 text-muted">
            Sumon Ahmed — {research.degree}, {research.institution}
          </p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Keywords">
            {research.keywords.map((k) => (
              <li key={k} className="t-label rounded-full border border-[var(--line-strong)] px-3 py-1 text-[10px]">
                {k}
              </li>
            ))}
          </ul>

          <div className="mt-12 grid gap-8 border-t border-[var(--line)] pt-8 md:grid-cols-12">
            <p className="t-label text-ink md:col-span-2">Abstract</p>
            <div className="grid gap-6 text-[1rem] leading-relaxed text-ink-2 md:col-span-10 md:grid-cols-2 md:gap-10">
              {research.abstract.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>

          <div className="mt-14 border-t border-[var(--line)] pt-10">
            <ResearchFigure />
          </div>

          <p className="t-label mt-10 flex items-start gap-3 border-t border-[var(--line)] pt-6 text-muted">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <span className="normal-case tracking-[0.02em]">{research.ethics}</span>
          </p>
        </article>
      </div>
    </section>
  );
}
