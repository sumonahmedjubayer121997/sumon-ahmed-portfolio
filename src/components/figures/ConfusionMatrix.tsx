import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Sequential ramp (one warm-grey hue, light → dark), validated with the dataviz
 * palette checker: monotone lightness, visible step gaps, light end ≥ 2:1 on ivory.
 */
const RAMP = ['#ADA698', '#918A7D', '#767065', '#5B564E', '#403C37', '#24221F'];
// Text inside a fill picks ink or ivory by the fill's luminance.
const TEXT_ON = ['#151413', '#151413', '#F5F2EB', '#F5F2EB', '#F5F2EB', '#F5F2EB'];

export interface ConfusionMatrixProps {
  labels: string[];
  /** Row-major counts: row = actual class, column = predicted class. */
  values: number[];
  caption?: string;
}

/**
 * Confusion matrix as a heat table. Colour encodes the share of each actual
 * class (row-normalised recall) so imbalanced classes stay comparable; the count
 * and percentage are printed in every cell. It is a real <table>, so screen
 * readers get row/column headers without a separate data view.
 */
export function ConfusionMatrix({ labels, values, caption }: ConfusionMatrixProps) {
  const n = labels.length;
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);

  const stats = useMemo(() => {
    const rows = labels.map((_, r) => values.slice(r * n, r * n + n));
    const rowSums = rows.map((row) => row.reduce((a, b) => a + b, 0));
    const total = rowSums.reduce((a, b) => a + b, 0);
    const correct = rows.reduce((a, row, r) => a + (row[r] ?? 0), 0);
    const recall = rows.map((row, r) => (rowSums[r] ? row[r] / rowSums[r] : 0));
    return {
      rows,
      rowSums,
      total,
      accuracy: total ? correct / total : 0,
      macroRecall: recall.reduce((a, b) => a + b, 0) / n,
    };
  }, [labels, values, n]);

  if (n < 2 || values.length !== n * n) return null;

  const share = (r: number, c: number) => (stats.rowSums[r] ? stats.rows[r][c] / stats.rowSums[r] : 0);
  const step = (s: number) => Math.min(RAMP.length - 1, Math.floor(s * RAMP.length));
  const pct = (s: number) => `${Math.round(s * 100)}%`;

  return (
    <figure className="w-full">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="t-label text-ink">Confusion matrix</p>
        <p className="t-label text-muted">
          accuracy {pct(stats.accuracy)} · macro recall {pct(stats.macroRecall)} · n ={' '}
          {stats.total.toLocaleString('en-GB')}
        </p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="border-separate [border-spacing:2px]">
          <caption className="sr-only">
            Confusion matrix. Rows are actual classes, columns are predicted classes; each cell shows the count and its
            share of the actual class.
          </caption>
          <thead>
            <tr>
              <td className="t-label pb-1 pr-2 text-right align-bottom text-[10px] text-muted">actual ↓ predicted →</td>
              {labels.map((l) => (
                <th
                  key={l}
                  scope="col"
                  className="t-label w-20 px-1 pb-1 text-center align-bottom text-[10px] font-normal leading-tight text-muted"
                >
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((rowLabel, r) => (
              <tr key={rowLabel}>
                <th
                  scope="row"
                  className="t-label max-w-40 pr-2 text-right text-[10px] font-normal leading-tight text-muted"
                >
                  {rowLabel}
                </th>
                {labels.map((colLabel, c) => {
                  const s = share(r, c);
                  const k = step(s);
                  return (
                    <td
                      key={colLabel}
                      onPointerEnter={() => setHover({ r, c })}
                      onPointerLeave={() => setHover(null)}
                      className={cn(
                        'h-14 w-20 min-w-11 rounded-[3px] text-center align-middle transition-[filter] duration-150',
                        hover?.r === r && hover.c === c && 'brightness-110',
                      )}
                      style={{ background: RAMP[k], color: TEXT_ON[k] }}
                    >
                      <span className="block text-[0.95rem] font-semibold leading-none [font-variant-numeric:tabular-nums]">
                        {stats.rows[r][c].toLocaleString('en-GB')}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] leading-none opacity-80">{pct(s)}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="t-meta mt-3 min-h-[1.25rem] text-[11px] text-ink-2" aria-hidden="true">
        {hover
          ? `${stats.rows[hover.r][hover.c].toLocaleString('en-GB')} ${labels[hover.r]} samples predicted as ${labels[hover.c]} — ${pct(share(hover.r, hover.c))} of all ${labels[hover.r]}.`
          : 'Shade = share of each actual class. The diagonal holds correct predictions.'}
      </p>

      <div className="mt-2 flex items-center gap-2" aria-hidden="true">
        <span className="t-label text-[10px] text-muted">0%</span>
        {RAMP.map((c) => (
          <span key={c} className="h-2 w-6 rounded-[2px]" style={{ background: c }} />
        ))}
        <span className="t-label text-[10px] text-muted">100% of class</span>
      </div>

      {caption && <figcaption className="mt-4 text-[0.92rem] leading-relaxed text-ink-2">{caption}</figcaption>}
    </figure>
  );
}
