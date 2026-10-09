import { useEffect, useState } from 'react';
import { Badge, Button, Field, Panel, TextArea } from '../ui';
import { aiUnavailable } from './config';

/** What an "Organize" run reports back to the panel (the editor has already filled its fields). */
export interface AiOutcome {
  altTitles: string[];
  questions: string[];
  warnings: string[];
  model: string;
  /** Field names that were filled, for the summary line. */
  filled: string[];
  /** Restores the fields as they were before this run. */
  undo: () => void;
}

const notesKey = (kind: string, id: string) => `ai-notes:${kind}:${id}`;

const readNotes = (key: string) => {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
};

const writeNotes = (key: string, value: string) => {
  try {
    if (value.trim()) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* storage blocked: notes last for this visit */
  }
};

/** After a new post/project is saved under its slug, its notes follow it. */
export function moveNotes(kind: string, from: string, to: string) {
  const v = readNotes(notesKey(kind, from));
  if (!v) return;
  writeNotes(notesKey(kind, to), v);
  writeNotes(notesKey(kind, from), '');
}

/**
 * "Organize with AI": rough notes in; the editor's own `run` fills its fields and
 * reports alternatives, questions and warnings. Notes are kept in this browser
 * (never saved to the site). Nothing is saved or published until you press Save.
 */
export function AiPanel({
  kind,
  id,
  noun,
  example,
  run,
  onUseTitle,
}: {
  kind: 'posts' | 'projects';
  /** The document's slug, or "new". */
  id: string;
  noun: string;
  example: string;
  run: (notes: string) => Promise<AiOutcome>;
  onUseTitle: (title: string) => void;
}) {
  const key = notesKey(kind, id);
  const [notes, setNotes] = useState(() => readNotes(key));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [outcome, setOutcome] = useState<AiOutcome | null>(null);
  const [open, setOpen] = useState(() => id === 'new' || !!readNotes(key));

  useEffect(() => {
    setNotes(readNotes(key));
    setOutcome(null);
  }, [key]);

  const edit = (v: string) => {
    setNotes(v);
    writeNotes(key, v);
  };

  const organize = async () => {
    if (notes.trim().length < 40) {
      setError(`Write a little more first — a few lines about the ${noun} is enough.`);
      return;
    }
    setBusy(true);
    setError(null);
    setDetail('');
    try {
      setOutcome(await run(notes));
    } catch (e) {
      const err = e as Error & { cause?: { message?: string } };
      setError(err.message);
      setDetail(err.cause?.message ?? '');
    } finally {
      setBusy(false);
    }
  };

  const undo = () => {
    outcome?.undo();
    setOutcome(null);
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3 border border-dashed border-[var(--line-strong)] px-5 py-3">
        <p className="text-[0.9rem] text-ink-2">Have rough notes? Let AI organize them into this {noun}.</p>
        <Button onClick={() => setOpen(true)}>Organize with AI</Button>
      </div>
    );
  }

  return (
    <Panel
      title="Organize with AI"
      description={`Paste rough notes — bullets, half sentences, numbers, links, code. Gemini arranges them into this ${noun} and fills the fields below. It only uses what your notes say: anything missing comes back as a question, and numbers or links it can’t find in your notes are flagged. Review, then Save.`}
      actions={
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Hide
        </Button>
      }
    >
      {aiUnavailable ? (
        <p className="text-[0.9rem] text-muted">{aiUnavailable}</p>
      ) : (
        <>
          <Field label="Your notes" hint="Kept in this browser only; not saved to the site.">
            {(fid) => <TextArea id={fid} rows={9} value={notes} onChange={edit} placeholder={example} />}
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => void organize()} disabled={busy}>
              {busy ? 'Organizing…' : outcome ? 'Organize again' : 'Organize with AI'}
            </Button>
            {outcome && !busy && (
              <Button variant="ghost" onClick={undo}>
                Undo AI changes
              </Button>
            )}
            <p className="text-[0.85rem] text-muted" role="status" aria-live="polite">
              {busy
                ? 'Usually 10–30 seconds.'
                : outcome
                  ? `Filled ${outcome.filled.join(', ')} · ${outcome.model}`
                  : ''}
            </p>
          </div>
          {error && (
            <div className="grid gap-1.5">
              <p className="text-[0.9rem] text-[#8f1d17]" role="alert">
                {error}
              </p>
              {detail && (
                <details className="text-[0.8rem] text-muted">
                  <summary className="cursor-pointer hover:text-ink">Technical details</summary>
                  <code className="mt-1 block break-words font-mono text-[0.75rem]">{detail}</code>
                </details>
              )}
            </div>
          )}

          {outcome && (
            <div className="grid gap-5 border-t border-[var(--line)] pt-5">
              {outcome.warnings.length > 0 && (
                <div className="grid gap-2">
                  <p className="flex items-center gap-2">
                    <Badge tone="warn">Check</Badge>
                    <span className="t-label text-[10px] text-ink">Before you publish</span>
                  </p>
                  <ul className="grid list-disc gap-1 pl-5 text-[0.9rem] text-ink-2">
                    {outcome.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              {outcome.questions.length > 0 && (
                <div className="grid gap-2">
                  <p className="t-label text-[10px] text-ink">Questions for you</p>
                  <ul className="grid list-disc gap-1 pl-5 text-[0.9rem] text-ink-2">
                    {outcome.questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                  <p className="text-[0.8rem] text-muted">
                    Add the answers to your notes and organize again, or type them straight into the fields.
                  </p>
                </div>
              )}
              {outcome.altTitles.length > 0 && (
                <div className="grid gap-2">
                  <p className="t-label text-[10px] text-ink">Other title ideas</p>
                  <ul className="flex flex-wrap gap-2">
                    {outcome.altTitles.map((t) => (
                      <li key={t}>
                        <button
                          type="button"
                          onClick={() => onUseTitle(t)}
                          className="rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-left text-[0.85rem] hover:border-ink"
                        >
                          {t} <span className="t-label ml-1 text-[9px] text-muted">Use</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
