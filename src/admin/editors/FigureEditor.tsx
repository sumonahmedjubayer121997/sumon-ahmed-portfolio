import { useRef, useState } from 'react';
import { figureSchema, type Figure } from '@/content/schema';
import { EvaluationFigure } from '@/components/figures/EvaluationFigure';
import { uploadImage } from '../data';
import { Field, Grid, LinesInput, NumberInput, ParsedTextArea, Rows, Select, TextArea, TextInput } from '../ui';

const TYPES = [
  { value: 'confusion-matrix', label: 'Confusion matrix (from your numbers)' },
  { value: 'pr-curve', label: 'Precision–recall curve (from your numbers)' },
  { value: 'image', label: 'Image (screenshot, chart export)' },
] as const;

type FigureType = Figure['type'];

export function blankFigure(type: FigureType): Figure {
  if (type === 'image') return { type, url: '', alt: '', caption: '' };
  if (type === 'confusion-matrix') return { type, labels: ['Negative', 'Positive'], values: [0, 0, 0, 0], caption: '' };
  return {
    type,
    series: [
      {
        label: 'Model',
        points: [
          { recall: 0, precision: 1 },
          { recall: 1, precision: 0.5 },
        ],
      },
    ],
    caption: '',
  };
}

/** Row-major N×N values rebuilt from a cell memory, so shrinking then growing loses nothing. */
function fromCells(cells: Map<string, number>, n: number) {
  const out: number[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out.push(cells.get(`${r},${c}`) ?? 0);
  return out;
}

function remember(cells: Map<string, number>, values: number[], n: number) {
  values.forEach((v, i) => cells.set(`${Math.floor(i / n)},${i % n}`, v));
}

const parseNumbers = (text: string) =>
  text
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);

type Points = Array<{ recall: number; precision: number }>;
const formatPoints = (points: Points) => points.map((p) => `${p.recall}, ${p.precision}`).join('\n');
const parsePoints = (text: string): Points =>
  text
    .split('\n')
    .map(parseNumbers)
    .filter((n) => n.length >= 2 && n.every(Number.isFinite))
    .map(([recall, precision]) => ({ recall, precision }));

export function FigureEditor({
  figure,
  onChange,
  folder,
}: {
  figure: Figure;
  onChange: (f: Figure) => void;
  folder: string;
}) {
  const [preview, setPreview] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  // Every matrix cell ever entered, so editing the labels (which passes through
  // intermediate counts while typing) never discards numbers.
  const cells = useRef(new Map<string, number>());
  if (figure.type === 'confusion-matrix') remember(cells.current, figure.values, figure.labels.length);
  const valid = figureSchema.safeParse(figure);

  return (
    <div className="grid gap-4">
      <Field label="Figure type">
        {(id) => (
          <Select<FigureType>
            id={id}
            value={figure.type}
            options={TYPES}
            onChange={(t) => t && t !== figure.type && onChange(blankFigure(t))}
          />
        )}
      </Field>

      {figure.type === 'image' && (
        <>
          <Grid>
            <Field
              label="Upload image"
              hint={uploading ? 'Uploading…' : (uploadError ?? 'PNG, JPG, WebP or SVG up to 8 MB.')}
            >
              {(id) => (
                <input
                  id={id}
                  type="file"
                  accept="image/*"
                  className="text-[0.85rem] file:mr-3 file:rounded-full file:border file:border-[var(--line-strong)] file:bg-transparent file:px-3 file:py-1.5 file:text-[0.8rem]"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    setUploadError(null);
                    try {
                      onChange({ ...figure, url: await uploadImage(file, folder) });
                    } catch (err) {
                      setUploadError((err as Error).message);
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              )}
            </Field>
            <Field label="…or image URL">
              {(id) => (
                <TextInput id={id} type="url" value={figure.url} onChange={(v) => onChange({ ...figure, url: v })} />
              )}
            </Field>
          </Grid>
          <Field label="Alt text" hint="What the image shows, for screen-reader users.">
            {(id) => <TextInput id={id} value={figure.alt} onChange={(v) => onChange({ ...figure, alt: v })} />}
          </Field>
        </>
      )}

      {figure.type === 'confusion-matrix' && (
        <>
          <Field label="Class labels" hint="One per line, in the same order as the rows/columns of your matrix.">
            {(id) => (
              <LinesInput
                id={id}
                rows={3}
                value={figure.labels}
                onChange={(labels) => onChange({ ...figure, labels, values: fromCells(cells.current, labels.length) })}
              />
            )}
          </Field>
          <Field label="Counts" hint="Rows = actual class, columns = predicted class.">
            {() => (
              <div className="overflow-x-auto">
                <table className="border-separate [border-spacing:4px]">
                  <thead>
                    <tr>
                      <td />
                      {figure.labels.map((l) => (
                        <th key={l} scope="col" className="t-label px-1 text-[10px] font-normal text-muted">
                          {l}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {figure.labels.map((rowLabel, r) => (
                      <tr key={rowLabel}>
                        <th scope="row" className="t-label pr-2 text-right text-[10px] font-normal text-muted">
                          {rowLabel}
                        </th>
                        {figure.labels.map((colLabel, c) => (
                          <td key={colLabel} className="w-24">
                            <NumberInput
                              id={`cm-${r}-${c}`}
                              min={0}
                              value={figure.values[r * figure.labels.length + c] ?? 0}
                              onChange={(v) => {
                                const values = [...figure.values];
                                values[r * figure.labels.length + c] = v;
                                onChange({ ...figure, values });
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Field>
          <Field
            label="Paste counts"
            hint="Paste the matrix from a spreadsheet or Python output (rows on separate lines)."
          >
            {(id) => (
              <TextArea
                id={id}
                rows={3}
                value={pasted}
                onChange={(text) => {
                  setPasted(text);
                  const nums = parseNumbers(text.replace(/[[\]]/g, ' '));
                  const n = figure.labels.length;
                  if (nums.length === n * n && nums.every((x) => Number.isFinite(x) && x >= 0))
                    onChange({ ...figure, values: nums });
                }}
              />
            )}
          </Field>
        </>
      )}

      {figure.type === 'pr-curve' && (
        <Field label="Models" hint="Up to three. The first is highlighted on the chart.">
          {() => (
            <Rows
              items={figure.series}
              onChange={(series) => onChange({ ...figure, series })}
              itemLabel={(s) => s.label}
              addLabel="Add model"
              create={() => ({
                label: '',
                points: [
                  { recall: 0, precision: 1 },
                  { recall: 1, precision: 0.5 },
                ],
              })}
              render={(s, update) => (
                <>
                  <Field label="Model name">
                    {(id) => <TextInput id={id} value={s.label} onChange={(v) => update((y) => void (y.label = v))} />}
                  </Field>
                  <Field
                    label="Points"
                    hint="One “recall, precision” pair per line, e.g. from sklearn’s precision_recall_curve."
                  >
                    {(id) => (
                      <ParsedTextArea
                        id={id}
                        rows={7}
                        value={s.points}
                        format={formatPoints}
                        parse={parsePoints}
                        onChange={(points) => update((y) => void (y.points = points))}
                      />
                    )}
                  </Field>
                </>
              )}
            />
          )}
        </Field>
      )}

      <Field label="Caption" hint="One sentence: what the reader should notice.">
        {(id) => (
          <TextArea id={id} rows={2} value={figure.caption} onChange={(v) => onChange({ ...figure, caption: v })} />
        )}
      </Field>

      <div className="border-t border-[var(--line)] pt-4">
        <button
          type="button"
          className="t-label text-[10px] text-muted underline hover:text-ink"
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? 'Hide preview' : 'Show preview'}
        </button>
        {preview && (
          <div className="mt-4 bg-ivory p-4">
            {valid.success ? (
              <EvaluationFigure figure={valid.data} />
            ) : (
              <p className="text-[0.85rem] text-muted">
                Preview appears once the figure is complete: {valid.error.issues[0]?.message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
