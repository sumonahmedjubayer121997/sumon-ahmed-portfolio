import { useRef } from 'react';
import { about } from '@/data/about';
import { clamp } from '@/lib/math';
import { cn } from '@/lib/cn';
import { useScrollPhysics } from '@/hooks/useScrollPhysics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SectionLabel } from '@/components/ui/SectionLabel';

/** Heading whose words brighten as it scrolls through the viewport (spring-smoothed). */
function ScrubHeading({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const words = useRef<Array<HTMLSpanElement | null>>([]);
  const reduced = useReducedMotion();
  const list = text.split(' ');

  useScrollPhysics(ref, {
    mode: 'through',
    immediate: reduced,
    onUpdate: ({ progress }) => {
      // Reveal across the first half of the heading's journey through the viewport.
      const p = reduced ? 1 : clamp((progress - 0.12) / 0.4);
      const n = list.length;
      words.current.forEach((el, i) => {
        if (!el) return;
        const o = 0.14 + 0.86 * clamp(p * n - i);
        const v = o.toFixed(3);
        if (el.style.opacity !== v) el.style.opacity = v;
      });
    },
  });

  return (
    <h2 ref={ref} id="about-title" className="t-h1 mt-8 max-w-[18ch]">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {list.map((w, i) => (
          <span
            key={i}
            ref={(el) => {
              words.current[i] = el;
            }}
            className={cn(w === 'intelligence.' && 't-serif')}
            style={{ opacity: 0.14 }}
          >
            {w}
            {i < list.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </h2>
  );
}

/** Vertical path of disciplines; a spring-driven line fills as you scroll and lights each stage. */
function StagePath() {
  const ref = useRef<HTMLOListElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const items = useRef<Array<HTMLLIElement | null>>([]);
  const reduced = useReducedMotion();
  const n = about.stages.length;

  useScrollPhysics(ref, {
    mode: 'center',
    immediate: reduced,
    onUpdate: ({ progress }) => {
      const p = reduced ? 1 : progress;
      if (fill.current) fill.current.style.transform = `scaleY(${p.toFixed(4)})`;
      items.current.forEach((el, i) => {
        if (!el) return;
        const on = String(p >= (i + 0.35) / n);
        if (el.dataset.active !== on) el.dataset.active = on;
      });
    },
  });

  return (
    <ol ref={ref} className="relative" aria-label="Path">
      <span className="absolute bottom-8 left-[7px] top-8 w-px bg-[var(--line-strong)]" aria-hidden="true" />
      <span
        ref={fill}
        className="absolute bottom-8 left-[7px] top-8 w-px origin-top bg-ink"
        style={{ transform: 'scaleY(0)' }}
        aria-hidden="true"
      />
      {about.stages.map((s, i) => {
        const last = i === n - 1;
        return (
          <li
            key={s.label}
            ref={(el) => {
              items.current[i] = el;
            }}
            data-active="false"
            className="group relative py-5 pl-12"
          >
            <span
              className="absolute left-0 top-[1.9rem] flex h-[15px] w-[15px] items-center justify-center rounded-full border border-[var(--line-strong)] bg-ivory transition-colors duration-500 group-data-[active=true]:border-ink"
              aria-hidden="true"
            >
              <span
                className={cn(
                  'h-[7px] w-[7px] scale-0 rounded-full transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-data-[active=true]:scale-100',
                  last ? 'bg-accent' : 'bg-ink',
                )}
              />
            </span>
            <span className="t-label text-muted">0{i + 1}</span>
            <p className="mt-1 text-[clamp(1.5rem,2.5vw,2.3rem)] font-medium leading-[1.1] tracking-[-0.035em] text-ink/45 transition-colors duration-700 group-data-[active=true]:text-ink">
              {s.label}
            </p>
            <p className="mt-1.5 text-[0.95rem] text-muted opacity-0 transition-opacity duration-700 group-data-[active=true]:opacity-100">
              {s.note}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function AboutSection() {
  return (
    <section id="about" aria-labelledby="about-title" className="section relative">
      <div className="shell">
        <SectionLabel index="04">About</SectionLabel>
        <ScrubHeading text={about.heading} />

        <div className="mt-20 grid gap-16 md:mt-28 md:grid-cols-12 md:gap-6">
          <div className="md:col-span-5">
            <div className="space-y-5 text-[1.075rem] leading-relaxed text-ink-2">
              {about.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <dl className="mt-12 border-t border-[var(--line)]">
              {about.facts.map((f) => (
                <div key={f.label} className="grid grid-cols-5 gap-4 border-b border-[var(--line)] py-3.5">
                  <dt className="t-label col-span-2 pt-0.5 text-muted">{f.label}</dt>
                  <dd className="col-span-3 text-[0.95rem]">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="md:col-span-6 md:col-start-7">
            <StagePath />
          </div>
        </div>
      </div>
    </section>
  );
}
