import { useMemo } from 'react';
import { modelStages, classLabels, classShares } from '@/data/dataModel';
import { buildModelTargets } from '@/lib/dataModelStages';
import { createRandom } from '@/lib/random';
import { palette } from '@/lib/color';
import { cn } from '@/lib/cn';

const CLASS_COLORS = [palette.accent, palette.ink, '#5E5A53', '#A39E94'];

function StagePlot({ stage, count = 320, className }: { stage: number; count?: number; className?: string }) {
  const t = useMemo(() => buildModelTargets(count, createRandom(5)), [count]);
  const pts = t.stages[stage];
  const tinted = stage >= 2;
  return (
    <svg viewBox="-330 -215 660 430" className={cn('h-auto w-full', className)} aria-hidden="true">
      {stage === 1 && <path d="M-250 170H250M-250 170V-170" stroke={palette.ink} strokeOpacity="0.25" fill="none" />}
      {stage === 2 && (
        <path d="M0 -200V200M-300 0H300" stroke={palette.ink} strokeOpacity="0.2" strokeDasharray="3 4" fill="none" />
      )}
      {Array.from({ length: count }, (_, i) => {
        const c = t.classes[i];
        return (
          <circle
            key={i}
            cx={pts[i * 3].toFixed(1)}
            cy={(-pts[i * 3 + 1]).toFixed(1)}
            r={stage === 3 ? 3.4 : 2.6}
            fill={tinted ? CLASS_COLORS[c] : palette.ink}
            fillOpacity={tinted ? (c === 0 ? 0.95 : 0.75) : 0.45}
          />
        );
      })}
    </svg>
  );
}

/** Static small multiples of the four stages — for reduced motion and no-WebGL. */
export function DataModelFallback() {
  return (
    <ol className="grid gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
      {modelStages.map((s, i) => (
        <li key={s.id} className="flex flex-col gap-4 bg-paper p-6">
          <span className="t-label text-muted">
            0{i + 1} — {s.label}
          </span>
          <StagePlot stage={i} />
          <h3 className="t-h3 text-[1.4rem]">{s.title}</h3>
          <p className="text-[0.95rem] leading-relaxed text-ink-2">{s.body}</p>
          {i === 3 && (
            <p className="t-label flex flex-wrap gap-x-4 gap-y-1 text-muted">
              {classLabels.map((l, c) => (
                <span key={l} className={c === 0 ? 'text-accent-ink' : undefined}>
                  {l} {Math.round(classShares[c] * 100)}%
                </span>
              ))}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Single final-stage plot, used if the WebGL scene fails at runtime. */
export function DataModelFallbackSingle() {
  return (
    <div className="absolute inset-0 flex items-center justify-end px-[8vw]">
      <StagePlot stage={3} className="max-w-[640px] md:w-[52vw]" />
    </div>
  );
}
