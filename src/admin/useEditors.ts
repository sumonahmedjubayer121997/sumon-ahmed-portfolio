import { useCallback, useEffect, useRef, useState } from 'react';
import type { ZodType } from 'zod';
import { loadCollection, loadDoc, saveCollection, saveDoc, validate, type Issue } from './data';
import { stripMeta, useDraft } from './useDraft';

/** Load → edit → validate → save for a single Firestore document. */
export function useDocEditor<T extends object>(path: string, id: string | null, schema: ZodType<T>) {
  const { draft, edit, reset, dirty } = useDraft<T>();
  const original = useRef<T | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>(id ? 'loading' : 'ready');
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState('loading');
    loadDoc<T>(path, id)
      .then((data) => {
        if (cancelled) return;
        if (!data) return setState('missing');
        original.current = stripMeta(data);
        reset(original.current);
        setSavedAt(data.updatedAt?.toDate() ?? null);
        setState('ready');
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [path, id, reset]);

  /** Start a new, unsaved document. */
  const create = useCallback(
    (value: T) => {
      original.current = null;
      reset(value);
      setIsNew(true);
    },
    [reset],
  );

  const save = useCallback(
    async (docId: string = id ?? '', patch?: Partial<T>) => {
      if (!draft || !docId) return false;
      const result = validate(schema, patch ? { ...draft, ...patch } : draft);
      if (!result.ok) {
        setIssues(result.issues);
        return false;
      }
      setSaving(true);
      try {
        await saveDoc(path, docId, result.data);
        original.current = result.data;
        reset(result.data);
        setIsNew(false);
        setIssues([]);
        setSavedAt(new Date());
        return true;
      } catch (e) {
        setIssues([{ path: '', message: (e as Error).message }]);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [draft, id, path, schema, reset],
  );

  const revert = useCallback(() => {
    reset(original.current);
    setIssues([]);
  }, [reset]);

  return { state, error, draft, edit, dirty: dirty || isNew, isNew, save, revert, create, issues, saving, savedAt };
}

/** Load → edit → validate → save for a whole ordered collection (experience, skills). */
export function useCollectionEditor<T extends { order: number }>(
  path: string,
  schema: ZodType<T>,
  idOf: (item: T) => string,
) {
  const { draft, edit, reset, dirty } = useDraft<{ items: T[] }>();
  const original = useRef<T[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCollection<T>(path)
      .then((docs) => {
        if (cancelled) return;
        original.current = docs.map((d) => stripMeta(d));
        reset({ items: original.current });
        setState('ready');
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [path, reset]);

  const save = useCallback(async () => {
    if (!draft) return;
    const all: Issue[] = [];
    const items = draft.items.map((item, i) => {
      const r = validate(schema, { ...item, order: i });
      if (!r.ok) r.issues.forEach((x) => all.push({ path: `${i + 1}.${x.path}`, message: x.message }));
      return r.ok ? r.data : null;
    });
    const ids = draft.items.map(idOf);
    if (new Set(ids).size !== ids.length) all.push({ path: 'id', message: 'Two entries share the same id' });
    if (all.length) return setIssues(all);

    setSaving(true);
    try {
      const valid = items as T[];
      const kept = new Set(valid.map(idOf));
      const removed = original.current.map(idOf).filter((i) => !kept.has(i));
      await saveCollection(
        path,
        valid.map((data) => ({ id: idOf(data), data })),
        removed,
      );
      original.current = valid;
      reset({ items: valid });
      setIssues([]);
      setSavedAt(new Date());
    } catch (e) {
      setIssues([{ path: '', message: (e as Error).message }]);
    } finally {
      setSaving(false);
    }
  }, [draft, schema, idOf, path, reset]);

  const revert = useCallback(() => {
    reset({ items: original.current });
    setIssues([]);
  }, [reset]);

  return { state, error, draft, edit, dirty, save, revert, issues, saving, savedAt };
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
