import { useEffect } from 'react';
import { pageTitle, siteTitle } from '@/lib/meta';

/** Keeps the title and description in step during client-side navigation (prerendered pages ship their own). */
export function useDocumentTitle(title?: string, description?: string) {
  useEffect(() => {
    document.title = pageTitle(title);
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previous = meta?.content;
    if (meta && description) meta.content = description;
    return () => {
      document.title = siteTitle;
      if (meta && previous) meta.content = previous;
    };
  }, [title, description]);
}
