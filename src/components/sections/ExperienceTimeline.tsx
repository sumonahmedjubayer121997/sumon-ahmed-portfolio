import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { milestones } from '@/data/experience';
import { useScrollPhysics } from '@/hooks/useScrollPhysics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useElementSize } from '@/hooks/useElementSize';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { RevealText } from '@/components/ui/RevealText';
import { ScrollInertia } from '@/components/ui/ScrollInertia';

/**
 * A thin, gently curving path. The active point follows the viewport's centre
 * line through a spring — it trails when you scroll fast, stretches with its
 * velocity, and settles when you stop.
 */
export function ExperienceTimeline() {
  const reduced = useReducedMotion();
  const compact = useIsMobile();
  const listRef = useRef<HTMLOListElement>(null);
  const dotRef = useRef<SVGGElement>(null);
  const clipRef = useRef<SVGRectElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const { height } = useElementSize(listRef);
  const [markers, setMarkers] = useState<number[]>([]);

  const amp = compact ? 5 : 9;
  const base = compact ? 10 : 22;
  const xAt = useMemo(() => (y: number) => base + Math.sin(y / 170) * amp, [amp, base]);

  const path = useMemo(() => {
    if (!height) return '';
    let d = `M${xAt(0).toFixed(1)} 0`;
    for (let y = 8; y <= height; y += 8) d += `L${xAt(y).toFixed(1)} ${y}`;
    return d;
  }, [height, xAt]);

  useLayoutEffect(() => {
    setMarkers(itemRefs.current.map((el) => (el ? el.offsetTop + 30 : 0)));
  }, [height]);

  const markersRef = useRef(markers);
  markersRef.current = markers;

  useScrollPhysics(listRef, {
    mode: 'center',
    immediate: reduced,
    onUpdate: ({ progress, velocity, height: h }) => {
      const y = reduced ? h : progress * h;
      const stretch = reduced ? 1 : 1 + Math.min(Math.abs(velocity) * 0.9, 0.9);
      if (dotRef.current)
        dotRef.current.setAttribute(
          'transform',
          `translate(${xAt(y).toFixed(2)} ${y.toFixed(2)}) scale(1 ${stretch.toFixed(3)})`,
        );
      if (clipRef.current) clipRef.current.setAttribute('height', String(Math.max(0, y)));
      markersRef.current.forEach((my, i) => {
        const el = itemRefs.current[i];
        if (!el) return;
        const on = String(y >= my - 6);
        if (el.dataset.active !== on) el.dataset.active = on;
      });
    },
  });

  const w = base * 2 + 12;

  return (
    <section id="experience" aria-labelledby="experience-title" className="section relative">
      <div className="shell">
        <div className="grid gap-8 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="md:sticky md:top-[calc(var(--nav-h)+3rem)]">
              <SectionLabel index="07">Path</SectionLabel>
              <RevealText
                as="h2"
                id="experience-title"
                text="From interfaces to intelligence."
                emphasis={['intelligence']}
                className="t-h2 mt-8 max-w-[11ch]"
              />
              <p className="mt-6 max-w-[34ch] text-[0.98rem] leading-relaxed text-ink-2">
                Each stage compounds on the last: interfaces taught me users, computer science taught me systems, data
                taught me humility.
              </p>
            </div>
          </div>

          <div className="relative md:col-span-8">
            {height > 0 && (
              <svg
                className="pointer-events-none absolute left-0 top-0 overflow-visible"
                width={w}
                height={height}
                aria-hidden="true"
              >
                <defs>
                  <clipPath id="exp-progress">
                    <rect ref={clipRef} x="0" y="0" width={w} height="0" />
                  </clipPath>
                </defs>
                <path d={path} fill="none" stroke="var(--line-strong)" strokeWidth="1" />
                <path d={path} fill="none" stroke="var(--color-ink)" strokeWidth="1" clipPath="url(#exp-progress)" />
                {markers.map((y, i) => (
                  <circle
                    key={i}
                    cx={xAt(y)}
                    cy={y}
                    r="4.5"
                    fill="var(--color-ivory)"
                    stroke="var(--color-ink)"
                    strokeOpacity="0.5"
                  />
                ))}
                <g ref={dotRef}>
                  <circle r="9" fill="var(--color-accent)" opacity="0.18" />
                  <circle r="4" fill="var(--color-accent)" />
                </g>
              </svg>
            )}

            <ol ref={listRef} style={{ paddingLeft: w + (compact ? 14 : 36) }}>
              {milestones.map((m, i) => (
                <li
                  key={m.year}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  data-active="false"
                  className="group pb-20 last:pb-4 md:pb-28"
                >
                  <ScrollInertia factor={0.006 * (i % 2 ? 1.4 : 1)} max={12}>
                    <p className="font-mono text-[clamp(2.4rem,5vw,4.6rem)] font-light leading-none tracking-[-0.05em] text-ink/45 transition-colors duration-700 group-data-[active=true]:text-ink">
                      {m.year}
                    </p>
                  </ScrollInertia>
                  <div className="mt-6 opacity-75 transition-opacity duration-700 group-data-[active=true]:opacity-100">
                    <p className="t-label text-muted">{m.context}</p>
                    <h3 className="t-h3 mt-3">{m.title}</h3>
                    <p className="mt-4 max-w-[52ch] text-[1rem] leading-relaxed text-ink-2">{m.body}</p>
                    <ul className="mt-5 flex flex-wrap gap-2" aria-label="Focus">
                      {m.tags.map((t) => (
                        <li
                          key={t}
                          className="t-label rounded-full border border-[var(--line-strong)] px-3 py-1 text-[10px]"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
