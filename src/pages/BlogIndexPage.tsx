import { useEffect, useState } from 'react';
import { posts, postsByDate, postTags } from '@/content';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { IntroText } from '@/components/ui/IntroText';
import { BlogRow } from '@/components/sections/BlogSection';
import { cn } from '@/lib/cn';
import { BLOG_DESCRIPTION } from '@/lib/meta';

/**
 * /blog — every note, newest first, filterable by tag. The filter lives in the
 * URL (?tag=RAG) so a filtered list can be shared; it is applied after
 * hydration, because the prerendered page always shows every note.
 */
export default function BlogIndexPage() {
  useDocumentTitle('Writing', BLOG_DESCRIPTION);
  const [tag, setTag] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search).get('tag');
    if (fromUrl && postTags.includes(fromUrl)) setTag(fromUrl);
  }, []);

  const choose = (next: string | null) => {
    setTag(next);
    const url = new URL(location.href);
    if (next) url.searchParams.set('tag', next);
    else url.searchParams.delete('tag');
    history.replaceState(history.state, '', url);
  };

  const list = tag ? postsByDate.filter((p) => p.tags.includes(tag)) : postsByDate;
  const chip = (active: boolean) =>
    cn(
      't-label rounded-full border px-3.5 py-2 text-[10px] transition-colors',
      active
        ? 'border-ink bg-ink text-ivory'
        : 'border-[var(--line-strong)] text-ink-2 hover:border-ink hover:text-ink',
    );

  return (
    <section id="blog" className="pb-24">
      <header className="shell pt-[calc(var(--nav-h)+7vh)]">
        <p className="t-label text-muted">
          Writing · {posts.length} {posts.length === 1 ? 'note' : 'notes'}
        </p>
        <IntroText text="Notes from first principles." className="t-h1 mt-6 max-w-[14ch]" />
        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <p className="t-lead max-w-[52ch] text-ink-2">{BLOG_DESCRIPTION}</p>
          <a href="/rss.xml" className="t-label link-draw shrink-0 text-muted hover:text-ink">
            Subscribe via RSS
          </a>
        </div>
      </header>

      <div className="shell mt-14 md:mt-16">
        {postTags.length > 1 && (
          <div role="group" aria-label="Filter notes by topic" className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={!tag} onClick={() => choose(null)} className={chip(!tag)}>
              All
            </button>
            {postTags.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tag === t}
                onClick={() => choose(tag === t ? null : t)}
                className={chip(tag === t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        <p className="sr-only" aria-live="polite">
          {tag ? `${list.length} ${list.length === 1 ? 'note' : 'notes'} about ${tag}` : ''}
        </p>
        <ul className="mt-10 border-t border-[var(--line)]">
          {list.map((p) => (
            <BlogRow key={p.slug} post={p} />
          ))}
        </ul>
      </div>
    </section>
  );
}
