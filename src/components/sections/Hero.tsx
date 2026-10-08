import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { site } from '@/content';
import { useIsHydrating } from '@/lib/hydration';
import { useBudget } from '@/hooks/useDevice';
import type { HeroBand } from '@/lib/heroStructure';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useCursorRepulsion } from '@/hooks/useCursorRepulsion';
import { PhysicsCanvas } from '@/components/PhysicsCanvas';
import { HeroFallback } from '@/components/fallbacks/HeroFallback';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { HeroReadout } from './HeroReadout';

const loadHeroScene = () => import('@/three/HeroScene');

/** Intro delay for the CSS keyframe classes (`intro-rise`, `intro-fade`). */
const delay = (s: number, y?: number) => ({ '--d': `${s}s`, ...(y ? { '--intro-y': `${y}px` } : {}) }) as CSSProperties;

/**
 * The prerendered hero plays its CSS intro from first paint, and hydration keeps
 * those DOM nodes, so the animation simply continues. When the hero mounts later
 * (navigating back to the homepage), offset the intro by the time since first
 * paint so it appears settled instead of replaying.
 */
function introOffset() {
  const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime;
  return fcp === undefined ? 0 : Math.max(0, (performance.now() - fcp) / 1000);
}

/**
 * The statement is the largest contentful paint, so the prerendered page paints
 * it without animation. It only fades in on a page's very first paint in dev
 * (where nothing is prerendered).
 */
const paintedBefore = () => performance.getEntriesByName('first-contentful-paint').length > 0;

function NameLine({ text, start }: { text: string; start: number }) {
  return (
    <span className="block overflow-hidden pb-[0.04em]" aria-hidden="true">
      {text.split('').map((ch, i) => (
        <span key={i} className="intro-rise inline-block" style={delay(start + i * 0.035)}>
          {ch}
        </span>
      ))}
    </span>
  );
}

/** Decorative mono tag that drifts out of the cursor's way. */
function DriftTag({ children }: { children: ReactNode }) {
  const area = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  useCursorRepulsion(
    area,
    (x, y) => {
      if (inner.current) inner.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    },
    { strength: 9, radius: 2.4 },
  );
  return (
    <span ref={area} className="inline-block">
      <span ref={inner} className="inline-block will-transform">
        {children}
      </span>
    </span>
  );
}

export function Hero() {
  const compact = useIsMobile();
  const n = useBudget({ high: 680, mid: 440, low: 240 });
  const count = compact ? Math.min(n, 280) : n;
  const [first, ...restOfName] = site.name.toUpperCase().split(' ');
  const last = restOfName.join(' ');
  const sectionRef = useRef<HTMLElement>(null);
  const rolesRef = useRef<HTMLDivElement>(null);
  const statementRef = useRef<HTMLParagraphElement>(null);
  const [band, setBand] = useState<HeroBand | null>(null);
  const hydrating = useIsHydrating();
  const [t0] = useState(() => (hydrating ? 0 : introOffset()));
  const [staticStatement] = useState(() => hydrating || paintedBefore());

  // Fit the simulation's structure into the whitespace between the roles and the statement.
  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const measure = () => {
      const top = section.getBoundingClientRect().top;
      const a = (rolesRef.current?.getBoundingClientRect().bottom ?? 0) - top;
      const b = (statementRef.current?.getBoundingClientRect().top ?? 0) - top;
      const height = Math.max(140, (b - a) * 0.92);
      const next = { center: (a + b) / 2, height };
      setBand((prev) =>
        prev && Math.abs(prev.center - next.center) < 4 && Math.abs(prev.height - next.height) < 4 ? prev : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(section);
    if (rolesRef.current) ro.observe(rolesRef.current);
    if (statementRef.current) ro.observe(statementRef.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="top"
      aria-labelledby="hero-title"
      className="relative flex min-h-[100svh] flex-col overflow-hidden"
      style={{ '--t0': `${t0.toFixed(3)}s` } as CSSProperties}
    >
      <PhysicsCanvas
        load={loadHeroScene}
        sceneProps={{ count, compact, band }}
        fallback={<HeroFallback count={count} band={band} />}
        eager
        className="absolute inset-0"
      />

      <div className="shell relative z-10 flex flex-1 flex-col pb-5 pt-[calc(var(--nav-h)+8vh)] md:pb-6 md:pt-[calc(var(--nav-h)+7vh)]">
        <h1 id="hero-title" className="t-display text-[21vw] md:whitespace-nowrap md:text-[13.6vw] 2xl:text-[12.8rem]">
          <span className="sr-only">{site.name}</span>
          <span className="block md:flex md:gap-[0.22em]">
            <NameLine text={first} start={0.15} />
            <NameLine text={last} start={0.32} />
          </span>
        </h1>

        <div
          ref={rolesRef}
          className="intro-fade t-label mt-6 grid gap-2 text-ink md:mt-8 md:grid-cols-12 md:gap-6"
          style={delay(0.9)}
        >
          <p className="flex items-center gap-2.5 md:col-span-3">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            <DriftTag>{site.role}</DriftTag>
          </p>
          <p className="md:col-span-5">
            <DriftTag>{site.disciplines.join(' · ')}</DriftTag>
          </p>
          <p className="hidden text-muted md:col-span-4 md:block md:text-right">
            <DriftTag>
              {site.location} — {site.year}
            </DriftTag>
          </p>
        </div>

        <div className="min-h-[14vh] flex-1 md:min-h-[6vh]" />

        <div className="grid gap-10 md:grid-cols-12 md:items-end md:gap-6">
          <p
            ref={statementRef}
            className={`${staticStatement ? '' : 'intro-fade '}max-w-[16ch] text-[clamp(2.5rem,5.3vw,5.6rem)] font-medium leading-[0.98] tracking-[-0.045em] md:col-span-7`}
            style={staticStatement ? undefined : delay(0.75, 24)}
          >
            {site.statement.lead} <span className="t-serif">{site.statement.emphasis}</span>
          </p>

          <div className="intro-fade flex flex-col gap-6 md:col-span-4 md:col-start-9" style={delay(1, 16)}>
            <p className="max-w-[38ch] text-[0.98rem] leading-relaxed text-ink-2">{site.intro}</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <MagneticButton to="/#work" variant="solid" arrow="down" cursor="Explore">
                View work
              </MagneticButton>
              <MagneticButton to="/#ai-lab" variant="text" arrow="right" cursor="Enter">
                AI Lab
              </MagneticButton>
            </div>
          </div>
        </div>

        <div
          className="intro-fade mt-10 flex items-end justify-between gap-6 border-t border-[var(--line)] pt-4 md:mt-10"
          style={delay(1.4)}
        >
          <HeroReadout />
          <p className="t-label hidden text-[10px] text-muted sm:block">
            {compact ? 'Touch to disturb the field' : 'Move to disturb · press to attract'}
          </p>
          <p className="t-label flex items-center gap-2 text-[10px] text-muted">
            Scroll
            <span className="relative block h-6 w-px overflow-hidden bg-[var(--line-strong)]" aria-hidden="true">
              <span className="absolute inset-x-0 top-0 h-1/2 bg-ink [animation:flow-y_1.8s_ease-in-out_infinite]" />
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
