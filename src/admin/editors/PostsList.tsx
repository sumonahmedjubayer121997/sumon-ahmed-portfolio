import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { collections, type Post } from '@/content/schema';
import { formatDate } from '@/content';
import { loadCollection } from '../data';
import { Badge } from '../ui';
import { PageHeader } from './common';

export default function PostsList() {
  const [items, setItems] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCollection<Post>(collections.posts).then(setItems, (e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <PageHeader
        title="Blog"
        description="Notes in the Writing section, each with its own page. Written in Markdown with a live preview."
        actions={
          <Link
            to="/admin/posts/new"
            className="t-label inline-flex h-9 items-center rounded-full bg-ink px-4 text-ivory hover:bg-ink-2"
          >
            + New post
          </Link>
        }
      />
      {error && <p className="text-[#8f1d17]">{error}</p>}
      {!items && !error && <p className="t-label text-muted">Loading…</p>}
      {items?.length === 0 && (
        <p className="text-[0.95rem] text-ink-2">
          No posts yet. Write one, or import the starter posts from the{' '}
          <Link to="/admin" className="underline">
            overview
          </Link>
          .
        </p>
      )}
      {items && items.length > 0 && (
        <ul className="border-t border-[var(--line)]">
          {items.map((p) => (
            <li key={p.slug} className="border-b border-[var(--line)]">
              <Link
                to={`/admin/posts/${p.slug}`}
                className="group grid grid-cols-12 items-center gap-4 py-4 hover:bg-paper/50"
              >
                <span className="t-label col-span-1 text-muted">{p.index}</span>
                <span className="col-span-11 sm:col-span-6">
                  <span className="block text-[1.1rem] font-medium tracking-[-0.02em] group-hover:underline">
                    {p.title}
                  </span>
                  <span className="t-label mt-1 block text-[10px] text-muted">{formatDate(p.date)}</span>
                </span>
                <span className="col-span-11 col-start-2 flex flex-wrap gap-2 sm:col-span-5 sm:col-start-auto sm:justify-end">
                  {!p.published && <Badge>Draft</Badge>}
                  {p.published && p.date > new Date().toISOString().slice(0, 10) && <Badge>Scheduled</Badge>}
                  {p.placeholders.length > 0 ? <Badge tone="warn">Needs review</Badge> : <Badge tone="ok">Ready</Badge>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
