import { useMemo } from 'react';
import { describeSketch, layoutSketch, type SketchSpec, type SketchTone } from '@/content/sketch';
import { cn } from '@/lib/cn';

const TONE: Record<SketchTone, string> = { ink: 'text-ink', muted: 'text-muted', accent: 'text-accent' };

/**
 * A hand-drawn diagram or chart (see content/sketch.ts). `animate` draws it
 * once, stroke by stroke, when it first appears (instant under reduced motion);
 * `decorative` hides it from screen readers and drops the labels, for small
 * thumbnails next to text that already says what it is.
 */
export function Sketch({
  spec,
  animate,
  decorative,
  className,
}: {
  spec: SketchSpec;
  animate?: boolean;
  decorative?: boolean;
  className?: string;
}) {
  const layout = useMemo(() => layoutSketch(spec), [spec]);
  const step = 55;
  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className={cn('sketch block h-auto w-full overflow-visible', animate && 'sketch-draw', className)}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': describeSketch(spec) })}
    >
      {layout.strokes.map((s, i) => (
        <path
          key={i}
          d={s.d}
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={decorative ? s.width * 1.8 : s.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={TONE[s.tone]}
          style={animate ? { animationDelay: `${i * step}ms` } : undefined}
        />
      ))}
      {!decorative &&
        layout.texts.map((t, i) => (
          <text
            key={i}
            x={t.x}
            y={t.y}
            textAnchor={t.anchor}
            dominantBaseline="central"
            fontSize={t.size}
            fill="currentColor"
            className={cn('sketch-label', TONE[t.tone])}
            style={
              animate ? { animationDelay: `${Math.round(layout.strokes.length * step * 0.5) + i * 70}ms` } : undefined
            }
          >
            {t.text}
          </text>
        ))}
    </svg>
  );
}
