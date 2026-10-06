import { useCallback, useMemo, useState } from 'react';

type WithPlaceholders = { placeholders?: string[] };

/**
 * Editable copy of a document. `edit` applies an immutable update; passing a
 * placeholder key marks that field as real (removes it from `placeholders`),
 * because editing a placeholder field means you're replacing it.
 */
export function useDraft<T extends object>(initial: T | null = null) {
  const [draft, setDraft] = useState<T | null>(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));

  const reset = useCallback((value: T | null) => {
    setDraft(value);
    setBaseline(JSON.stringify(value));
  }, []);

  const edit = useCallback((fn: (d: T) => void, placeholderKey?: string) => {
    setDraft((d) => {
      if (!d) return d;
      const next = structuredClone(d);
      fn(next);
      const p = next as T & WithPlaceholders;
      if (placeholderKey && Array.isArray(p.placeholders)) {
        p.placeholders = p.placeholders.filter((k) => k !== placeholderKey);
      }
      return next;
    });
  }, []);

  const dirty = useMemo(() => draft !== null && JSON.stringify(draft) !== baseline, [draft, baseline]);

  return { draft, edit, reset, dirty };
}

/** Removes Firestore metadata before a document becomes an editor draft. */
export function stripMeta<T extends object>(data: T & { updatedAt?: unknown }): T {
  const { updatedAt: _ignored, ...rest } = data;
  void _ignored;
  return rest as T;
}
