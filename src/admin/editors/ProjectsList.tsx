import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { collections, type Project } from '@/content/schema';
import { loadCollection } from '../data';
import { Badge } from '../ui';
import { PageHeader } from './common';

export default function ProjectsList() {
  const [items, setItems] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCollection<Project>(collections.projects).then(setItems, (e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <PageHeader
        title="Projects"
        description="Case studies on the homepage and their detail pages. Add real metrics, evaluation figures and your decisions."
        actions={
          <Link
            to="/admin/projects/new"
            className="t-label inline-flex h-9 items-center rounded-full bg-ink px-4 text-ivory hover:bg-ink-2"
          >
            + New project
          </Link>
        }
      />
      {error && <p className="text-[#8f1d17]">{error}</p>}
      {!items && !error && <p className="t-label text-muted">Loading…</p>}
      {items && (
        <ul className="border-t border-[var(--line)]">
          {items.map((p) => (
            <li key={p.slug} className="border-b border-[var(--line)]">
              <Link
                to={`/admin/projects/${p.slug}`}
                className="group grid grid-cols-12 items-center gap-4 py-4 hover:bg-paper/50"
              >
                <span className="t-label col-span-1 text-muted">{p.index}</span>
                <span className="col-span-11 text-[1.1rem] font-medium tracking-[-0.02em] group-hover:underline sm:col-span-6">
                  {p.title}
                </span>
                <span className="col-span-11 col-start-2 flex flex-wrap gap-2 sm:col-span-5 sm:col-start-auto sm:justify-end">
                  {!p.published && <Badge>Draft</Badge>}
                  {p.placeholders.length > 0 ? (
                    <Badge tone="warn">
                      {p.placeholders.length} placeholder{p.placeholders.length > 1 ? 's' : ''}
                    </Badge>
                  ) : (
                    <Badge tone="ok">Complete</Badge>
                  )}
                  {p.figures.length > 0 && (
                    <Badge>
                      {p.figures.length} figure{p.figures.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
