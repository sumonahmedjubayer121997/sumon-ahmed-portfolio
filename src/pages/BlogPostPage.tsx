import { Suspense, lazy, useRef } from 'react';
import { useParams } from 'react-router';
import { formatDate, getPost, posts, type Block } from '@/data/blog';
import { pipelines } from '@/data/aiLab';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useScrollPhysics } from '@/hooks/useScrollPhysics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TransitionLink } from '@/components/ui/TransitionLink';
import { RevealText } from '@/components/ui/RevealText';
import { Arrow, SwapArrow } from '@/components/ui/Arrow';
import { PipelineVisualization } from '@/components/sections/PipelineVisualization';
import NotFoundPage from './NotFoundPage';

const TfidfDemo = lazy(() => import('@/components/demos/TfidfDemo'));

function renderBlock(b: Block, i: number) {
  switch (b.type) {
    case 'p':
      return (
        <p key={i} className="mt-6 text-[1.125rem] leading-[1.75] text-ink-2">
          {b.text}
        </p>
      );
    case 'h2':
      return (
        <h2 key={i} className="t-h3 mt-16 text-ink">
          {b.text}
        </h2>
      );
    case 'code':
      return (
        <pre
          key={i}
          className="t-meta mt-8 overflow-x-auto border border-[var(--line)] bg-paper/70 p-5 text-[13px] leading-relaxed text-ink"
          tabIndex={0}
          aria-label={`${b.lang} code example`}
        >
          <code>{b.code}</code>
        </pre>
      );
    case 'formula':
      return (
        <p key={i} className="t-meta mt-8 border-l-2 border-accent bg-paper/50 px-5 py-4 text-[14px] text-ink">
          {b.text}
        </p>
      );
    case 'list':
      return (
        <ul key={i} className="mt-6 space-y-3">
          {b.items.map((item) => (
            <li key={item} className="relative pl-7 text-[1.075rem] leading-relaxed text-ink-2">
              <span className="absolute left-0 top-[0.8em] h-px w-4 bg-ink" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      );
    case 'demo':
      return (
        <div key={i} className="my-12 md:-mx-16 lg:-mx-32">
          {b.demo === 'tfidf' ? (
            <Suspense fallback={<div className="h-[420px] border border-[var(--line)]" aria-busy="true" />}>
              <TfidfDemo />
            </Suspense>
          ) : (
            <div className="border border-[var(--line-strong)] bg-paper/50 p-5 sm:p-8">
              <p className="t-label mb-6 text-ink">
                Live model · {b.demo === 'rag-pipeline' ? pipelines.rag.label : pipelines.agent.label}
              </p>
              <PipelineVisualization
                pipeline={b.demo === 'rag-pipeline' ? pipelines.rag : pipelines.agent}
                theme="light"
              />
            </div>
          )}
        </div>
      );
  }
}

export default function BlogPostPage() {
  const { slug = '' } = useParams();
  const post = getPost(slug);
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

  if (!post) return <NotFoundPage />;
  const next = posts[(posts.indexOf(post) + 1) % posts.length];

  return (
    <article className="pb-10">
      <span
        ref={barRef}
        aria-hidden="true"
        className="fixed inset-x-0 top-[var(--nav-h)] z-40 h-px origin-left bg-accent"
        style={{ transform: 'scaleX(0)' }}
      />
      <header className="shell pt-[calc(var(--nav-h)+7vh)]">
        <TransitionLink to="/#blog" className="group t-label inline-flex items-center gap-2 text-muted hover:text-ink">
          <Arrow direction="left" className="transition-transform duration-500 group-hover:-translate-x-1" />
          Writing
        </TransitionLink>
        <p className="t-label mt-14 flex flex-wrap gap-x-4 gap-y-1 text-muted">
          <span>{post.index}</span>
          <span>{formatDate(post.date)}</span>
          <span>{post.readingTime} read</span>
          <span>{post.tags.join(' · ')}</span>
        </p>
        <RevealText as="h1" immediate text={post.title} className="t-h1 mt-6 max-w-[16ch]" />
        <p className="t-lead mt-8 max-w-[52ch] text-ink-2">{post.excerpt}</p>
      </header>

      <div ref={bodyRef} className="shell mt-16 md:mt-20">
        <div className="mx-auto max-w-[68ch] border-t border-[var(--line)] pt-4">{post.blocks.map(renderBlock)}</div>
      </div>

      <div className="shell mt-24">
        <TransitionLink
          to={`/blog/${next.slug}`}
          data-cursor="Read"
          className="group block border-t border-ink pb-16 pt-10 md:pb-24"
        >
          <span className="t-label text-muted">Next note — {next.index}</span>
          <span className="mt-6 flex items-end justify-between gap-6">
            <span className="t-h2 max-w-[18ch] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-4">
              {next.title}
            </span>
            <span className="mb-2 text-[clamp(1.4rem,3vw,2.6rem)]">
              <SwapArrow direction="right" />
            </span>
          </span>
        </TransitionLink>
      </div>
    </article>
  );
}
