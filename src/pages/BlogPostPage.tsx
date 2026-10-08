import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { formatDate, getPost, relatedPosts, site, type PostDemoKind, type PostMeta } from '@/content';
import { getPostBlocks } from '@/content/posts';
import { headings, type Block } from '@/content/markdown';
import { pipelines } from '@/data/aiLab';
import { SITE_URL } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { copyText } from '@/lib/clipboard';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useScrollPhysics } from '@/hooks/useScrollPhysics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TransitionLink } from '@/components/ui/TransitionLink';
import { IntroText } from '@/components/ui/IntroText';
import { Arrow } from '@/components/ui/Arrow';
import { PipelineVisualization } from '@/components/sections/PipelineVisualization';
import { PostBody, jumpToHeading } from '@/components/blog/PostBody';
import NotFoundPage from './NotFoundPage';

const TfidfDemo = lazy(() => import('@/components/demos/TfidfDemo'));

function renderDemo(kind: PostDemoKind) {
  if (kind === 'tfidf')
    return (
      <Suspense fallback={<div className="h-[420px] border border-[var(--line)]" aria-busy="true" />}>
        <TfidfDemo />
      </Suspense>
    );
  const pipeline = kind === 'rag-pipeline' ? pipelines.rag : pipelines.agent;
  return (
    <div className="border border-[var(--line-strong)] bg-paper/50 p-5 sm:p-8">
      <p className="t-label mb-6 text-ink">Live model · {pipeline.label}</p>
      <PipelineVisualization pipeline={pipeline} theme="light" />
    </div>
  );
}

type HeadingBlock = Extract<Block, { type: 'h2' | 'h3' }>;

/** Section list; the entry for the section being read is marked as current. */
function Contents({ items, className }: { items: HeadingBlock[]; className?: string }) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const els = items.map((h) => document.getElementById(h.id)).filter((el): el is HTMLElement => !!el);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Contents" className={className}>
      <p className="t-label text-[10px] text-muted">Contents</p>
      <ol className="mt-4 space-y-2.5 border-l border-[var(--line)]">
        {items.map((h) => (
          <li key={h.id} className={h.type === 'h3' ? 'pl-7' : 'pl-4'}>
            <a
              href={`#${h.id}`}
              onClick={(e) => jumpToHeading(e, h.id)}
              aria-current={current === h.id ? 'location' : undefined}
              className={cn(
                '-ml-px block border-l pl-3 text-[0.88rem] leading-snug transition-colors',
                current === h.id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Share({ post }: { post: PostMeta }) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');
  const link = 't-label link-draw text-ink-2 hover:text-ink';
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <span className="t-label text-muted">Share</span>
      <a
        className={link}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
      >
        LinkedIn
      </a>
      <a
        className={link}
        href={`https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}`}
        target="_blank"
        rel="noreferrer"
      >
        X
      </a>
      <button
        type="button"
        className={link}
        onClick={() =>
          void copyText(url).then((ok) => {
            setCopy(ok ? 'copied' : 'failed');
            window.setTimeout(() => setCopy('idle'), 2400);
          })
        }
      >
        {copy === 'copied' ? 'Link copied' : copy === 'failed' ? 'Copy failed' : 'Copy link'}
      </button>
      <span className="sr-only" aria-live="polite">
        {copy === 'copied'
          ? 'Link copied to the clipboard'
          : copy === 'failed'
            ? `Couldn’t copy. The link is ${url}`
            : ''}
      </span>
    </div>
  );
}

function AuthorBox() {
  const profiles = site.socials.filter((s) => /^https?:\/\/[^/]+\/.+/.test(s.href));
  return (
    <aside aria-label="About the author" className="border border-[var(--line)] bg-paper/50 p-6 sm:p-8">
      <p className="t-label text-[10px] text-muted">Written by</p>
      <p className="mt-3 text-[1.35rem] font-medium tracking-[-0.02em] text-ink">{site.name}</p>
      <p className="mt-1 text-[0.95rem] text-ink-2">{site.role}</p>
      <p className="mt-4 max-w-[56ch] text-[0.98rem] leading-relaxed text-ink-2">{site.intro}</p>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
        <TransitionLink to="/#work" className="t-label link-draw text-ink">
          See projects
        </TransitionLink>
        <TransitionLink to="/#contact" className="t-label link-draw text-ink">
          Get in touch
        </TransitionLink>
        {profiles.map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="t-label link-draw text-ink-2">
            {s.label}
          </a>
        ))}
      </div>
    </aside>
  );
}

export default function BlogPostPage() {
  const { slug = '' } = useParams();
  const post = getPost(slug);
  const blocks = getPostBlocks(slug);
  useDocumentTitle(post?.title, post?.excerpt);
  const reduced = useReducedMotion();
  const bodyRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  // Reading progress with a little inertia.
  useScrollPhysics(bodyRef, {
    mode: 'pinned',
    immediate: reduced,
    onUpdate: ({ progress }) => {
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
    },
  });

  if (!post || !blocks) return <NotFoundPage />;
  const toc = headings(blocks);
  const showToc = toc.filter((h) => h.type === 'h2').length >= 3;
  const related = relatedPosts(post);
  const revised = post.updated && post.updated > post.date;

  return (
    <article className="pb-10">
      <span
        ref={barRef}
        aria-hidden="true"
        className="fixed inset-x-0 top-[var(--nav-h)] z-40 h-px origin-left bg-accent"
        style={{ transform: 'scaleX(0)' }}
      />
      <header className="shell pt-[calc(var(--nav-h)+7vh)]">
        <TransitionLink to="/blog" className="group t-label inline-flex items-center gap-2 text-muted hover:text-ink">
          <Arrow direction="left" className="transition-transform duration-500 group-hover:-translate-x-1" />
          All notes
        </TransitionLink>
        <p className="t-label mt-14 flex flex-wrap gap-x-4 gap-y-1 text-muted">
          <span>{post.index}</span>
          <span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </span>
          {revised && (
            <span>
              Updated <time dateTime={post.updated}>{formatDate(post.updated)}</time>
            </span>
          )}
          <span>{post.readingTime} read</span>
          <span>{post.tags.join(' · ')}</span>
        </p>
        <IntroText text={post.title} className="t-h1 mt-6 max-w-[16ch]" />
        <p className="t-lead mt-8 max-w-[52ch] text-ink-2">{post.excerpt}</p>
      </header>

      <div ref={bodyRef} className="shell mt-16 md:mt-20">
        <div className="grid gap-x-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,68ch)_minmax(0,1fr)]">
          {showToc && (
            <Contents
              items={toc}
              className="hidden self-start lg:sticky lg:top-[calc(var(--nav-h)+3rem)] lg:block lg:max-h-[calc(100svh-var(--nav-h)-6rem)] lg:overflow-y-auto"
            />
          )}
          <div className="min-w-0 border-t border-[var(--line)] pt-4 lg:col-start-2">
            {showToc && (
              <details className="mt-4 border border-[var(--line)] px-5 py-4 lg:hidden">
                <summary className="t-label cursor-pointer text-[10px] text-ink">Contents</summary>
                <Contents items={toc} className="mt-4 [&>p]:hidden" />
              </details>
            )}
            <PostBody blocks={blocks} renderDemo={renderDemo} />
            <div className="mt-16 border-t border-[var(--line)] pt-6">
              <Share post={post} />
            </div>
            <div className="mt-10">
              <AuthorBox />
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="shell mt-24">
          <h2 id="related-title" className="t-label text-muted">
            Keep reading
          </h2>
          <ul
            className={cn(
              'mt-6 grid gap-px border border-[var(--line)] bg-[var(--line)]',
              related.length === 2 ? 'md:grid-cols-2' : related.length >= 3 && 'md:grid-cols-3',
            )}
          >
            {related.map((p) => (
              <li key={p.slug} className="bg-ivory">
                <TransitionLink
                  to={`/blog/${p.slug}`}
                  data-cursor="Read"
                  className="group flex h-full flex-col justify-between gap-8 p-6 transition-colors hover:bg-paper/60"
                >
                  <span className="text-[1.3rem] font-medium leading-tight tracking-[-0.02em] text-ink">{p.title}</span>
                  <span className="t-label flex items-center justify-between gap-4 text-muted">
                    <span>
                      {formatDate(p.date)} · {p.readingTime} read
                    </span>
                    <Arrow className="transition-transform duration-500 group-hover:translate-x-1" />
                  </span>
                </TransitionLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
