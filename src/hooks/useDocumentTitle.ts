import { useEffect } from 'react';

const DEFAULT_TITLE = 'Sumon Ahmed — Data Scientist · AI & LLM Engineer';

export function useDocumentTitle(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} — Sumon Ahmed` : DEFAULT_TITLE;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previous = meta?.content;
    if (meta && description) meta.content = description;
    return () => {
      document.title = DEFAULT_TITLE;
      if (meta && previous) meta.content = previous;
    };
  }, [title, description]);
}
