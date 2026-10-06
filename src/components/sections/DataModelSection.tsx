import { useMemo, useRef } from 'react';
import { modelStages, classLabels, classShares } from '@/data/dataModel';
import { budget, supportsWebGL } from '@/lib/device';
import { stageValue } from '@/lib/dataModelStages';
import { cn } from '@/lib/cn';
import { useScrollPhysics } from '@/hooks/useScrollPhysics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { PhysicsCanvas } from '@/components/PhysicsCanvas';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { RevealText } from '@/components/ui/RevealText';
import { DataModelFallback, DataModelFallbackSingle } from '@/components/fallbacks/DataModelFallback';

const loadScene = () => import('@/three/DataModelScene');

/**
 * Data → Features → Model → Prediction, told with ~1,000 particles in a pinned,
 * scroll-driven scene. Progress is spring-smoothed, so the particles carry
 * momentum when you scroll fast and settle when you stop.
 */
export function DataModelSection() {
  const reduced = useReducedMotion();
  const webgl = useMemo(() => supportsWebGL(), []);

  if (reduced || !webgl) {
    return (
      <section id="method" aria-labelledby="method-title" className="section bg-paper">
        <div className="shell">
          <Header />
          <div className="mt-16">
            <DataModelFallback />
          </div>
        </div>
      </section>
    );
  }
  return <PinnedStory />;
}

function Header({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <SectionLabel index="02">Method</SectionLabel>
      <RevealText
        as="h2"
        id="method-title"
        text="From raw data to a decision."
        emphasis={['decision']}
        className={cn(compact ? 't-h2 mt-5' : 't-h2 mt-8', 'max-w-[12ch]')}
      />
    </div>
  );
}

function PinnedStory() {
  const compact = useIsMobile();
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const barRef = useRef<HTMLSpanElement>(null);
  const mobileTitle = useRef<HTMLParagraphElement>(null);
  const mobileBody = useRef<HTMLParagraphElement>(null);
  const mobileIndex = useRef<HTMLSpanElement>(null);
  const labelRefs = useRef<Array<HTMLElement | null>>([]);
  const lastActive = useRef(-1);

  const count = useMemo(() => {
    const n = budget({ high: 1000, mid: 640, low: 360 });
    return compact ? Math.min(n, 460) : n;
  }, [compact]);

  const progress = useScrollPhysics(trackRef, {
    mode: 'pinned',
    onUpdate: (st) => {
      if (barRef.current) barRef.current.style.transform = `scaleX(${st.progress.toFixed(4)})`;
      const active = Math.min(3, Math.floor(stageValue(st.progress) + 0.5));
      if (active === lastActive.current) return;
      lastActive.current = active;
      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        el.dataset.active = String(i === active);
        if (i === active) el.setAttribute('aria-current', 'step');
        else el.removeAttribute('aria-current');
      });
      const s = modelStages[active];
      if (mobileTitle.current) mobileTitle.current.textContent = s.title;
      if (mobileBody.current) mobileBody.current.textContent = s.body;
      if (mobileIndex.current) mobileIndex.current.textContent = `0${active + 1} / 04`;
    },
  });

  return (
    <section id="method" aria-labelledby="method-title" className="relative bg-paper">
      <div ref={trackRef} className="relative h-[400vh]">
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <PhysicsCanvas
            className="absolute inset-0"
            load={loadScene}
            sceneProps={{ count, compact, progress, labelRefs }}
            fallback={<DataModelFallbackSingle />}
            fallbackOnReducedMotion={false}
          />

          {/* Prediction group labels, positioned by the scene */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {classLabels.map((label, i) => (
              <div
                key={label}
                ref={(el) => {
                  labelRefs.current[i] = el;
                }}
                className="t-label absolute left-0 top-0 whitespace-nowrap text-[10px] opacity-0"
              >
                <span className={i === 0 ? 'text-accent-ink' : 'text-ink'}>{label}</span>
                <span className="ml-2 text-muted">{Math.round(classShares[i] * 100)}%</span>
              </div>
            ))}
          </div>

          <div className="shell pointer-events-none relative flex h-full flex-col pb-8 pt-[calc(var(--nav-h)+4vh)] md:pb-10 md:pt-[calc(var(--nav-h)+8vh)]">
            <div className="pointer-events-auto md:max-w-[34%]">
              <Header compact={compact} />
            </div>

            {/* Desktop: full stage list */}
            <ol className="pointer-events-auto mt-12 hidden max-w-[34%] md:block">
              {modelStages.map((s, i) => (
                <li
                  key={s.id}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  data-active={i === 0}
                  className="group border-t border-[var(--line)] py-4"
                >
                  <div className="flex items-baseline gap-4">
                    <span className="t-label w-6 text-muted transition-colors duration-500 group-data-[active=true]:text-accent-ink">
                      0{i + 1}
                    </span>
                    <span className="text-[1.15rem] font-medium tracking-[-0.02em] text-muted transition-colors duration-500 group-data-[active=true]:text-ink">
                      {s.label}
                    </span>
                  </div>
                  <div className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[active=true]:grid-rows-[1fr] group-data-[active=true]:opacity-100">
                    <div className="min-h-0 overflow-hidden pl-10">
                      <p className="pt-2 text-[0.95rem] leading-relaxed text-ink-2">{s.body}</p>
                      <p className="t-label pt-3 text-muted">
                        n = {count.toLocaleString('en-GB')} · {s.readout}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="flex-1" />

            {/* Mobile: active stage only */}
            <div className="pointer-events-auto md:hidden" aria-live="polite">
              <span ref={mobileIndex} className="t-label text-accent-ink">
                01 / 04
              </span>
              <p ref={mobileTitle} className="t-h3 mt-2">
                {modelStages[0].title}
              </p>
              <p ref={mobileBody} className="mt-2 max-w-[38ch] text-[0.92rem] leading-relaxed text-ink-2">
                {modelStages[0].body}
              </p>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <span className="t-label text-[10px] text-muted">Data</span>
              <span className="relative h-px flex-1 bg-[var(--line-strong)]" aria-hidden="true">
                <span ref={barRef} className="absolute inset-0 origin-left bg-ink" style={{ transform: 'scaleX(0)' }} />
              </span>
              <span className="t-label text-[10px] text-muted">Prediction</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
