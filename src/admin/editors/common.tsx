import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** Loading / missing / error states shared by every editor. */
export function EditorState({
  state,
  error,
  children,
}: {
  state: 'loading' | 'ready' | 'missing' | 'error';
  error?: string | null;
  children: ReactNode;
}) {
  if (state === 'loading') return <p className="t-label text-muted">Loading…</p>;
  if (state === 'error')
    return (
      <p className="text-[0.95rem] text-[#8f1d17]" role="alert">
        Couldn’t load this content: {error}
      </p>
    );
  if (state === 'missing')
    return (
      <p className="text-[0.95rem] text-ink-2">
        Nothing here yet. Go to the{' '}
        <Link to="/admin" className="underline">
          overview
        </Link>{' '}
        and import the starter content.
      </p>
    );
  return <>{children}</>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[clamp(1.8rem,3vw,2.6rem)] font-medium leading-none tracking-[-0.035em]">{title}</h1>
        {description && <p className="mt-3 max-w-[64ch] text-[0.95rem] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions}
    </header>
  );
}

/** Helpers for field-level placeholder badges. */
export function placeholderProps(draft: { placeholders?: string[] }, key: string, confirm: (key: string) => void) {
  return { placeholder: draft.placeholders?.includes(key) ?? false, onConfirm: () => confirm(key) };
}
