import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { Issue } from './data';

/* ───────────────────────── Layout ───────────────────────── */

export function Panel({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="border border-[var(--line)] bg-ivory p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="t-label text-ink">{title}</h2>
          {description && <p className="mt-1.5 max-w-[60ch] text-[0.9rem] leading-relaxed text-muted">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}

export function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const c = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[cols];
  return <div className={cn('grid gap-5', c)}>{children}</div>;
}

/* ───────────────────────── Buttons & badges ───────────────────────── */

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  title?: string;
};

export function Button({
  children,
  onClick,
  variant = 'secondary',
  disabled,
  type = 'button',
  className,
  title,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        't-label inline-flex h-9 items-center gap-2 rounded-full px-4 transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'bg-ink text-ivory hover:bg-ink-2',
        variant === 'secondary' && 'border border-[var(--line-strong)] hover:border-ink',
        variant === 'danger' && 'border border-[#b3261e]/40 text-[#8f1d17] hover:border-[#8f1d17]',
        variant === 'ghost' && 'px-2 text-muted hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'warn' | 'ok' }) {
  return (
    <span
      className={cn(
        't-label inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px]',
        tone === 'muted' && 'bg-ink/[0.06] text-muted',
        tone === 'warn' && 'bg-accent/15 text-accent-ink',
        tone === 'ok' && 'bg-[#2f6b45]/10 text-[#2f6b45]',
      )}
    >
      {tone === 'warn' && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />}
      {children}
    </span>
  );
}

/* ───────────────────────── Fields ───────────────────────── */

const inputClass =
  'w-full rounded-[3px] border border-[var(--line-strong)] bg-white/60 px-3 py-2 text-[0.95rem] text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-ink focus-visible:outline-none';

export interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  /** This field still holds placeholder content. */
  placeholder?: boolean;
  onConfirm?: () => void;
  children: (id: string) => ReactNode;
}

/** Label + control + hint/error, with a placeholder badge when the value isn't real yet. */
export function Field({ label, hint, error, placeholder, onConfirm, children }: FieldProps) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="t-label text-[10px] text-ink-2">
          {label}
        </label>
        {placeholder && (
          <>
            <Badge tone="warn">Placeholder</Badge>
            {onConfirm && (
              <button
                type="button"
                onClick={onConfirm}
                className="t-label text-[10px] text-muted underline hover:text-ink"
              >
                Mark as real
              </button>
            )}
          </>
        )}
      </div>
      {children(id)}
      {error ? (
        <p className="text-[0.8rem] text-[#8f1d17]" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-[0.8rem] text-muted">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({
  id,
  value,
  onChange,
  type = 'text',
  placeholder,
  readOnly,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'email' | 'url' | 'date';
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      className={cn(inputClass, readOnly && 'bg-transparent text-muted')}
    />
  );
}

export function TextArea({
  id,
  value,
  onChange,
  rows = 4,
  mono,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  /** Monospace, for Markdown and code. */
  mono?: boolean;
}) {
  return (
    <textarea
      id={id}
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className={cn(inputClass, 'resize-y leading-relaxed', mono && 'font-mono text-[0.85rem]')}
    />
  );
}

/** Number input that keeps partial typing ("0.") but only emits valid numbers. */
export function NumberInput({
  id,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText((t) => (Number(t) === value ? t : String(value))), [value]);
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      value={text}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== '' && Number.isFinite(n)) onChange(n);
      }}
      className={cn(inputClass, '[font-variant-numeric:tabular-nums]')}
    />
  );
}

export function Select<T extends string>({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: T | '';
  options: ReadonlyArray<{ value: T | ''; label: string }>;
  onChange: (v: T | '') => void;
}) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as T | '')} className={inputClass}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-[0.92rem]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="relative h-5 w-9 rounded-full bg-ink/20 transition-colors peer-checked:bg-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-ivory after:transition-transform peer-checked:after:translate-x-4" />
      {label}
    </label>
  );
}

/** One string per line ↔ string[] (tags, stack, pipeline stages, …). */
export function LinesInput({
  id,
  value,
  onChange,
  rows = 4,
}: {
  id: string;
  value: string[];
  onChange: (v: string[]) => void;
  rows?: number;
}) {
  const [text, setText] = useState(value.join('\n'));
  useEffect(() => {
    setText((t) =>
      t
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .join('\n') === value.join('\n')
        ? t
        : value.join('\n'),
    );
  }, [value]);
  return (
    <textarea
      id={id}
      rows={rows}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(
          e.target.value
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }}
      className={cn(inputClass, 'resize-y font-mono text-[0.85rem] leading-relaxed')}
    />
  );
}

/**
 * Free text parsed into a value on every keystroke. Unlike LinesInput, the raw
 * text is kept while typing (half-typed lines may not parse yet) and is only
 * replaced when the value changes from outside.
 */
export function ParsedTextArea<T>({
  id,
  value,
  format,
  parse,
  onChange,
  rows = 6,
}: {
  id: string;
  value: T;
  format: (v: T) => string;
  parse: (text: string) => T;
  onChange: (v: T) => void;
  rows?: number;
}) {
  const [text, setText] = useState(() => format(value));
  const lastEmitted = useRef<string>(JSON.stringify(value));
  useEffect(() => {
    const json = JSON.stringify(value);
    if (json !== lastEmitted.current) {
      lastEmitted.current = json;
      setText(format(value));
    }
  }, [value, format]);
  return (
    <textarea
      id={id}
      rows={rows}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const parsed = parse(e.target.value);
        lastEmitted.current = JSON.stringify(parsed);
        onChange(parsed);
      }}
      className={cn(inputClass, 'resize-y font-mono text-[0.85rem] leading-relaxed')}
    />
  );
}

/* ───────────────────────── Repeatable rows ───────────────────────── */

export function Rows<T>({
  items,
  onChange,
  render,
  create,
  itemLabel,
  addLabel = 'Add',
}: {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, update: (fn: (d: T) => void) => void, index: number) => ReactNode;
  create: () => T;
  itemLabel: (item: T, index: number) => string;
  addLabel?: string;
}) {
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <div className="grid gap-3">
      {items.map((item, i) => (
        <div key={i} className="border border-[var(--line)] bg-paper/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="t-label truncate text-[10px] text-muted">
              {String(i + 1).padStart(2, '0')} · {itemLabel(item, i) || 'Untitled'}
            </p>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">
                ↑<span className="sr-only">Move up</span>
              </Button>
              <Button variant="ghost" onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Move down">
                ↓<span className="sr-only">Move down</span>
              </Button>
              <Button variant="ghost" onClick={() => onChange(items.filter((_, j) => j !== i))} title="Remove">
                Remove
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            {render(
              item,
              (fn) => {
                const next = structuredClone(items);
                fn(next[i]);
                onChange(next);
              },
              i,
            )}
          </div>
        </div>
      ))}
      <div>
        <Button onClick={() => onChange([...items, create()])}>+ {addLabel}</Button>
      </div>
    </div>
  );
}

/* ───────────────────────── Save bar ───────────────────────── */

export function SaveBar({
  dirty,
  saving,
  issues,
  savedAt,
  onSave,
  onRevert,
}: {
  dirty: boolean;
  saving: boolean;
  issues: Issue[];
  savedAt: Date | null;
  onSave: () => void;
  onRevert: () => void;
}) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  return (
    <div className="sticky bottom-0 z-10 -mx-5 mt-6 border-t border-[var(--line)] bg-ivory/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
      {issues.length > 0 && (
        <ul className="mb-3 grid gap-1 text-[0.85rem] text-[#8f1d17]" role="alert">
          {issues.slice(0, 6).map((i) => (
            <li key={i.path + i.message}>
              <span className="font-mono text-[0.78rem]">{i.path || 'document'}</span> — {i.message}
            </li>
          ))}
          {issues.length > 6 && <li>…and {issues.length - 6} more</li>}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="t-label text-[10px] text-muted" aria-live="polite">
          {saving
            ? 'Saving…'
            : dirty
              ? 'Unsaved changes'
              : savedAt
                ? `Saved ${savedAt.toLocaleTimeString()}`
                : 'No changes'}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onRevert} disabled={!dirty || saving}>
            Revert
          </Button>
          <Button variant="primary" onClick={onSave} disabled={!dirty || saving}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Error message for an exact field path from a list of validation issues. */
export const issueFor = (issues: Issue[], path: string) => issues.find((i) => i.path === path)?.message;
