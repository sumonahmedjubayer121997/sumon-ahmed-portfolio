import { useMemo } from 'react';
import type { ConceptId } from '@/content/schema';
import { conceptShape, layoutCover, type ShapePart } from '@/content/cover';
import { cn } from '@/lib/cn';

function Parts({ parts, accent, strokeWidth }: { parts: ShapePart[]; accent: boolean; strokeWidth: number }) {
  return (
    <>
      {parts.map((p, i) => {
        const color = p.tone === 'ink' ? 'text-ink' : accent ? 'text-accent' : 'text-ink';
        return p.mode === 'fill' ? (
          <path key={i} d={p.d} fill="currentColor" className={color} opacity={p.opacity} />
        ) : (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
            className={color}
          />
        );
      })}
    </>
  );
}

/** A concept's shape (content/cover.ts), for tags, map nodes and skill groups. */
export function ConceptGlyph({
  concept,
  accent,
  className,
}: {
  concept: ConceptId;
  accent?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="-10 -10 20 20" aria-hidden="true" className={cn('inline-block h-3 w-3 shrink-0', className)}>
      <Parts parts={conceptShape(concept, 16)} accent={!!accent} strokeWidth={1.4} />
    </svg>
  );
}

/**
 * A project's geometric cover: its concepts as large shapes in ink and orange,
 * arranged by its saved seed. Decorative — the project's title and concepts
 * are always written next to it.
 */
export function GeometricCover({
  concepts,
  seed,
  className,
}: {
  concepts: readonly ConceptId[];
  seed: number;
  className?: string;
}) {
  const layout = useMemo(() => layoutCover(concepts, seed), [concepts, seed]);
  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      aria-hidden="true"
      className={cn('block h-auto w-full', className)}
    >
      <line
        x1={36}
        x2={layout.width - 36}
        y1={layout.baseline.y}
        y2={layout.baseline.y}
        stroke="currentColor"
        strokeWidth={1}
        className="text-ink/25"
      />
      <circle
        cx={layout.ring.x}
        cy={layout.ring.y}
        r={layout.ring.r}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        className="text-ink/40"
      />
      {layout.shapes.map((s) => (
        <g key={s.concept} transform={`translate(${s.x} ${s.y}) rotate(${s.rotate})`}>
          <Parts parts={conceptShape(s.concept, s.size)} accent={s.fill === 'accent'} strokeWidth={1.6} />
        </g>
      ))}
    </svg>
  );
}
