import { useState } from 'react';
import { sketchKindLabels, sketchKinds, sketchProblems, type SketchKind, type SketchSpec } from '@/content/sketch';
import { Sketch } from '@/components/sketch/Sketch';
import { aiUnavailable } from '../ai/config';
import { Button, Field, Grid, LinesInput, Panel, Select, TextInput } from '../ui';

const toLines = (s: SketchSpec) =>
  s.kind === 'bar' ? s.labels.map((l, i) => `${l}: ${s.values?.[i] ?? ''}`.trim()) : s.labels;

function fromLines(kind: SketchKind, lines: string[], caption?: string): SketchSpec {
  const spec: SketchSpec =
    kind === 'bar'
      ? (() => {
          const pairs = lines.map((l) => {
            const at = l.lastIndexOf(':');
            return at < 0 ? [l, ''] : [l.slice(0, at).trim(), l.slice(at + 1).trim()];
          });
          return { kind, labels: pairs.map((p) => p[0]), values: pairs.map((p) => p[1]) };
        })()
      : { kind, labels: lines };
  if (caption) spec.caption = caption;
  return spec;
}

/**
 * Post editor → Header sketch: the hand-drawn diagram shown above the post and
 * on its card. Pick a template and type the labels (charts: "Label: value"), or
 * let Gemini suggest one from the post. The preview is the real component.
 */
export function SketchField({
  value,
  onChange,
  post,
}: {
  value: SketchSpec | null;
  onChange: (v: SketchSpec | null) => void;
  post: { title: string; excerpt: string; body: string };
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const problems = value ? sketchProblems(value) : [];

  const setKind = (kind: SketchKind | '') => {
    if (!kind) return onChange(null);
    const lines = value
      ? toLines(value)
      : kind === 'cycle'
        ? ['Think', 'Act', 'Observe']
        : ['Input', 'Model', 'Output'];
    onChange(
      fromLines(
        kind,
        kind === 'bar'
          ? lines.map((l) => (l.includes(':') ? l : `${l}: `))
          : lines.map((l) => l.replace(/:\s*[^:]*$/, '')),
        value?.caption,
      ),
    );
  };

  const suggest = async () => {
    if (post.body.trim().length < 80) {
      setError('Write a bit of the post first — the suggestion is based on it.');
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const { suggestSketch } = await import('../ai/organize');
      const r = await suggestSketch(post);
      onChange(r.spec);
      setNote([`Suggested by ${r.model}. Edit anything, then Save.`, ...r.warnings].join(' '));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Header sketch"
      description="A hand-drawn diagram above the post and on its card in the blog list. It draws itself once when the post opens."
      actions={
        <Button onClick={() => void suggest()} disabled={busy || !!aiUnavailable} title={aiUnavailable ?? undefined}>
          {busy ? 'Suggesting…' : 'Suggest with AI'}
        </Button>
      }
    >
      <Grid cols={2}>
        <Field label="Template">
          {(id) => (
            <Select<SketchKind>
              id={id}
              value={value?.kind ?? ''}
              onChange={setKind}
              options={[
                { value: '', label: 'None' },
                ...sketchKinds.map((k) => ({ value: k, label: sketchKindLabels[k] })),
              ]}
            />
          )}
        </Field>
        {value && (
          <Field label="Caption" hint="Optional, under the sketch.">
            {(id) => (
              <TextInput
                id={id}
                value={value.caption ?? ''}
                onChange={(v) => onChange({ ...value, caption: v || undefined })}
              />
            )}
          </Field>
        )}
      </Grid>
      {value && (
        <>
          <Field
            label={value.kind === 'bar' ? 'Bars — one per line, “Label: value”' : 'Labels — one per line, in order'}
            hint={
              value.kind === 'bar' ? 'Values exactly as in your post, e.g. 0.81 or 92%.' : 'Two to six short labels.'
            }
            error={problems[0]}
          >
            {(id) => (
              <LinesInput
                id={id}
                rows={Math.max(3, value.labels.length + 1)}
                value={toLines(value)}
                onChange={(lines) => onChange(fromLines(value.kind, lines, value.caption))}
              />
            )}
          </Field>
          {problems.length === 0 && (
            <div className="border border-[var(--line)] bg-white/50 p-4 text-ink">
              <Sketch spec={value} />
            </div>
          )}
        </>
      )}
      {note && <p className="text-[0.85rem] text-muted">{note}</p>}
      {error && (
        <p className="text-[0.9rem] text-[#8f1d17]" role="alert">
          {error}
        </p>
      )}
    </Panel>
  );
}
