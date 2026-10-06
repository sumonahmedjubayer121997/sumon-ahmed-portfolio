import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useElementSize } from '@/hooks/useElementSize';
import { clamp } from '@/lib/math';

/**
 * Series colours in fixed order: the featured model in a contrast-safe orange
 * (≥ 3:1 on ivory), comparison models in ink and grey. Identity never relies on
 * colour alone — there is always a legend and a table view.
 */
const SERIES = ['#C4581A', '#151413', '#8C877E'];

export interface PRSeries {
  label: string;
  points: Array<{ recall: number; precision: number }>;
}

/** Area under the PR curve by the trapezoid rule (an approximation of average precision). */
export function areaUnderPR(points: PRSeries['points']) {
  const p = [...points].sort((a, b) => a.recall - b.recall);
  let area = 0;
  for (let i = 1; i < p.length; i++)
    area += (p[i].recall - p[i - 1].recall) * ((p[i].precision + p[i - 1].precision) / 2);
  return area;
}

function precisionAt(points: PRSeries['points'], recall: number) {
  const p = points;
  if (recall <= p[0].recall) return p[0].precision;
  for (let i = 1; i < p.length; i++) {
    if (recall <= p[i].recall) {
      const t = (recall - p[i - 1].recall) / (p[i].recall - p[i - 1].recall || 1);
      return p[i - 1].precision + (p[i].precision - p[i - 1].precision) * t;
    }
  }
  return p[p.length - 1].precision;
}

const M = { top: 12, right: 16, bottom: 40, left: 58 };
const TICKS = [0, 0.25, 0.5, 0.75, 1];

/** Precision–recall curves with a snapping crosshair, legend and table view. */
export function PRCurve({ series, caption }: { series: PRSeries[]; caption?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const { width } = useElementSize(wrap);
  const [recall, setRecall] = useState<number | null>(null);

  const data = useMemo(
    () =>
      series.slice(0, SERIES.length).map((s, i) => {
        const points = [...s.points].sort((a, b) => a.recall - b.recall);
        return { ...s, points, color: SERIES[i], ap: areaUnderPR(points) };
      }),
    [series],
  );

  const w = Math.max(width, 260);
  const h = clamp(w * 0.6, 220, 360);
  const pw = w - M.left - M.right;
  const ph = h - M.top - M.bottom;
  const x = (r: number) => M.left + r * pw;
  const y = (p: number) => M.top + (1 - p) * ph;

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setRecall(Math.round(clamp((e.clientX - box.left) / box.width) * 100) / 100);
  };
  const onKey = (e: KeyboardEvent<SVGRectElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const step = e.key === 'ArrowRight' ? 0.05 : -0.05;
    setRecall((r) => Math.round(clamp((r ?? 0.5) + step) * 100) / 100);
  };

  const readout = recall === null ? null : data.map((s) => ({ ...s, value: precisionAt(s.points, recall) }));

  return (
    <figure className="w-full">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="t-label text-ink">Precision–recall</p>
        {data.length > 1 ? (
          <ul className="flex flex-wrap gap-x-5 gap-y-1" aria-label="Legend">
            {data.map((s) => (
              <li key={s.label} className="t-label flex items-center gap-2 text-[10px] text-ink-2">
                <span className="h-[2px] w-4 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                {s.label} <span className="text-muted">AP≈{s.ap.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-label text-[10px] text-muted">
            {data[0]?.label} · AP≈{data[0]?.ap.toFixed(2)}
          </p>
        )}
      </div>

      <div ref={wrap} className="relative mt-4">
        {width > 0 && (
          <svg width={w} height={h} className="block overflow-visible" aria-hidden="true">
            {TICKS.map((t) => (
              <g key={t}>
                <line x1={x(0)} x2={x(1)} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                <line x1={x(t)} x2={x(t)} y1={y(0)} y2={y(1)} stroke="var(--line)" strokeWidth={1} />
                <text x={M.left - 8} y={y(t) + 3} textAnchor="end" className="fill-muted font-mono text-[10px]">
                  {t.toFixed(2)}
                </text>
                <text x={x(t)} y={y(0) + 16} textAnchor="middle" className="fill-muted font-mono text-[10px]">
                  {t.toFixed(2)}
                </text>
              </g>
            ))}
            <text
              x={M.left + pw / 2}
              y={h - 4}
              textAnchor="middle"
              className="fill-muted font-mono text-[10px] uppercase tracking-[0.14em]"
            >
              Recall
            </text>
            <text
              x={10}
              y={M.top + ph / 2}
              textAnchor="middle"
              transform={`rotate(-90 10 ${M.top + ph / 2})`}
              className="fill-muted font-mono text-[10px] uppercase tracking-[0.14em]"
            >
              Precision
            </text>
            {[...data].reverse().map((s) => (
              <path
                key={s.label}
                d={s.points
                  .map((p, i) => `${i ? 'L' : 'M'}${x(p.recall).toFixed(1)} ${y(p.precision).toFixed(1)}`)
                  .join('')}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {readout && recall !== null && (
              <g>
                <line
                  x1={x(recall)}
                  x2={x(recall)}
                  y1={y(0)}
                  y2={y(1)}
                  stroke="var(--color-ink)"
                  strokeOpacity={0.35}
                  strokeWidth={1}
                />
                {readout.map((s) => (
                  <circle
                    key={s.label}
                    cx={x(recall)}
                    cy={y(s.value)}
                    r={4}
                    fill={s.color}
                    stroke="var(--color-ivory)"
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}
          </svg>
        )}

        {width > 0 && (
          <svg width={w} height={h} className="absolute inset-0">
            <rect
              x={M.left}
              y={M.top}
              width={pw}
              height={ph}
              fill="transparent"
              tabIndex={0}
              role="slider"
              aria-label="Recall"
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={recall ?? 0.5}
              aria-valuetext={
                readout
                  ? `Recall ${recall?.toFixed(2)}: ${readout.map((s) => `${s.label} precision ${s.value.toFixed(2)}`).join(', ')}`
                  : 'Use left and right arrows to read precision at a recall'
              }
              className="cursor-crosshair outline-none focus-visible:stroke-[var(--color-accent)] focus-visible:stroke-2"
              onPointerMove={onMove}
              onPointerLeave={() => setRecall(null)}
              onKeyDown={onKey}
              onBlur={() => setRecall(null)}
            />
          </svg>
        )}

        {readout && recall !== null && (
          <div
            className="pointer-events-none absolute top-2 rounded-[4px] border border-[var(--line)] bg-ivory/95 px-3 py-2 shadow-[0_12px_30px_-18px_rgba(21,20,19,0.4)]"
            style={recall > 0.6 ? { right: w - x(recall) + 12 } : { left: x(recall) + 12 }}
            aria-hidden="true"
          >
            <p className="t-label text-[10px] text-muted">recall {recall.toFixed(2)}</p>
            {readout.map((s) => (
              <p key={s.label} className="mt-1 flex items-center gap-2 whitespace-nowrap text-[12px]">
                <span className="h-[2px] w-3 rounded-full" style={{ background: s.color }} />
                <strong className="font-semibold text-ink [font-variant-numeric:tabular-nums]">
                  {s.value.toFixed(3)}
                </strong>
                <span className="text-muted">{s.label}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {caption && <figcaption className="mt-4 text-[0.92rem] leading-relaxed text-ink-2">{caption}</figcaption>}

      <details className="mt-3">
        <summary className="t-label cursor-pointer text-muted hover:text-ink">View as table</summary>
        {data.map((s) => (
          <table key={s.label} className="t-meta mt-3 w-full border-collapse text-left text-[12px]">
            <caption className="t-label pb-1 text-left text-muted">{s.label}</caption>
            <thead>
              <tr>
                <th className="border-b border-[var(--line)] py-1 font-normal text-muted">Recall</th>
                <th className="border-b border-[var(--line)] py-1 font-normal text-muted">Precision</th>
              </tr>
            </thead>
            <tbody>
              {s.points.map((p, i) => (
                <tr key={i}>
                  <td className="border-b border-[var(--line)] py-1 [font-variant-numeric:tabular-nums]">
                    {p.recall.toFixed(3)}
                  </td>
                  <td className="border-b border-[var(--line)] py-1 [font-variant-numeric:tabular-nums]">
                    {p.precision.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </details>
    </figure>
  );
}
