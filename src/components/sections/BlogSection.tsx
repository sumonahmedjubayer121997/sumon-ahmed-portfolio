import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { posts, formatDate, type Post } from '@/data/blog';
import { springs } from '@/physics/spring';
import { useSpringPhysics } from '@/hooks/useSpringPhysics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TransitionLink } from '@/components/ui/TransitionLink';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { RevealText } from '@/components/ui/RevealText';
import { Arrow } from '@/components/ui/Arrow';

const ARROW = 56;

/**
 * Editorial row. On hover the title drifts right on a spring, a paper wash rises
 * from the baseline, reading time appears and a round arrow follows the cursor
 * (it replaces the cursor inside the row).
 */
function BlogRow({ post }: { post: Post }) {
  const reduced = useReducedMotion();
  const rowRef = useRef<HTMLAnchorElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const inside = useRef(false);

  const title = useSpringPhysics(springs.magnetic, (s) => {
    if (titleRef.current) titleRef.current.style.transform = `translate3d(${s.x}px, 0, 0)`;
  });
  const arrow = useSpringPhysics({ stiffness: 260, damping: 22, mass: 1 }, (s) => {
    if (arrowRef.current) arrowRef.current.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
  });

  const local = (e: ReactPointerEvent) => {
    const r = rowRef.current!.getBoundingClientRect();
    return [e.clientX - r.left - ARROW / 2, e.clientY - r.top - ARROW / 2] as const;
  };

  const enter = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const [x, y] = local(e);
    if (!inside.current) arrow.snap(x, y);
    inside.current = true;
    if (!reduced) title.setTarget(18, 0);
  };
  const move = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const [x, y] = local(e);
    if (reduced) arrow.snap(x, y);
    else arrow.setTarget(x, y);
  };
  const leave = () => {
    inside.current = false;
    title.setTarget(0, 0);
  };
  const focus = () => {
    const r = rowRef.current!.getBoundingClientRect();
    arrow.snap(r.width - ARROW - 8, r.height / 2 - ARROW / 2);
    if (!reduced) title.setTarget(18, 0);
  };

  return (
    <li className="border-b border-[var(--line)]">
      <TransitionLink
        ref={rowRef}
        to={`/blog/${post.slug}`}
        data-cursor="none"
        onPointerEnter={enter}
        onPointerMove={move}
        onPointerLeave={leave}
        onFocus={focus}
        onBlur={leave}
        className="group relative block overflow-hidden py-9 md:py-12"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 origin-bottom scale-y-0 bg-paper transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-y-100 group-focus-visible:scale-y-100"
        />
        <div className="relative grid grid-cols-12 items-baseline gap-x-4 gap-y-4 px-1 md:px-4">
          <span className="t-label col-span-2 text-muted md:col-span-1">{post.index}</span>
          <div className="col-span-10 md:col-span-8">
            <h3
              ref={titleRef}
              className="text-[clamp(1.75rem,4.3vw,4.1rem)] font-medium leading-[1.02] tracking-[-0.042em] will-transform"
            >
              {post.title}
            </h3>
            <span className="mt-4 grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-500 md:grid-rows-[0fr] md:opacity-0 md:group-hover:grid-rows-[1fr] md:group-hover:opacity-100 md:group-focus-visible:grid-rows-[1fr] md:group-focus-visible:opacity-100">
              <span className="min-h-0 overflow-hidden">
                <span className="block max-w-[52ch] text-[0.98rem] leading-relaxed text-ink-2">{post.excerpt}</span>
              </span>
            </span>
          </div>
          <span className="t-label col-span-10 col-start-3 flex gap-4 text-muted md:col-span-3 md:col-start-auto md:flex-col md:items-end md:gap-1.5">
            <span>{formatDate(post.date)}</span>
            <span className="transition-opacity duration-500 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
              {post.readingTime} read
            </span>
          </span>
        </div>
        <span
          ref={arrowRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 hidden h-14 w-14 scale-50 items-center justify-center rounded-full bg-ink text-ivory opacity-0 transition-[opacity,scale] duration-300 will-transform group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 md:flex"
        >
          <Arrow className="h-4 w-4" />
        </span>
      </TransitionLink>
    </li>
  );
}

export function BlogSection() {
  return (
    <section id="blog" aria-labelledby="blog-title" className="section relative">
      <div className="shell">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <SectionLabel index="08">Writing</SectionLabel>
            <RevealText
              as="h2"
              id="blog-title"
              text="Notes from first principles."
              emphasis={['principles.']}
              className="t-h1 mt-8"
            />
          </div>
          <p className="max-w-[38ch] text-[0.98rem] leading-relaxed text-ink-2 md:col-span-4">
            Explanations I wish I’d had — written to be understood, with working examples where it helps.
          </p>
        </div>
        <ul className="mt-16 border-t border-[var(--line)] md:mt-20">
          {posts.map((p) => (
            <BlogRow key={p.slug} post={p} />
          ))}
        </ul>
      </div>
    </section>
  );
}
