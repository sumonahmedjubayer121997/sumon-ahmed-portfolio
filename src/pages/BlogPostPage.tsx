import { Suspense, lazy, useRef } from 'react';
import { useParams } from 'react-router';
import { formatDate, getPost, posts, type PostDemoKind } from '@/content';
import { pipelines } from '@/data/aiLab';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useScrollPhysics } from '@/hooks/useScrollPhysics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TransitionLink } from '@/components/ui/TransitionLink';
import { IntroText } from '@/components/ui/IntroText';
import { Arrow, SwapArrow } from '@/components/ui/Arrow';
import { PipelineVisualization } from '@/components/sections/PipelineVisualization';
import { PostBody } from '@/components/blog/PostBody';
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
  const next = posts.length > 1 ? posts[(posts.indexOf(post) + 1) % posts.length] : null;

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
        <IntroText text={post.title} className="t-h1 mt-6 max-w-[16ch]" />
        <p className="t-lead mt-8 max-w-[52ch] text-ink-2">{post.excerpt}</p>
      </header>

      <div ref={bodyRef} className="shell mt-16 md:mt-20">
        <div className="mx-auto max-w-[68ch] border-t border-[var(--line)] pt-4">
          <PostBody blocks={post.blocks} renderDemo={renderDemo} />
        </div>
      </div>

      {next && (
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
      )}
    </article>
  );
}
