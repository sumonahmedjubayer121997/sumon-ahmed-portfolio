import type { MouseEvent, ReactNode } from 'react';
import { postDemoLabels, type Block, type CalloutKind, type PostDemoKind } from '@/content/markdown';
import { TransitionLink } from '@/components/ui/TransitionLink';
import { scrollToId } from '@/hooks/useTransitionNavigate';
import { cn } from '@/lib/cn';
import { Sketch } from '@/components/sketch/Sketch';

const INLINE =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)\s]+\))|(==(?:\S[^=]*?\S|\S)==)|(\(\((?:\S[^()]*?\S|\S)\)\))/g;

/** A loose hand-drawn ellipse, stretched around whatever it circles. */
const CIRCLE = 'M50 3C78 2 98 9 97 20 96 33 70 38 46 37 20 36 2 30 3 19 4 8 30 2 62 4';

/** **bold**, *italic*, `code`, [links](…), ==highlights== and ((circled)) text inside a block. */
function Inline({ text, preview }: { text: string; preview?: boolean }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [tok] = m;
    const key = m.index;
    if (m[1]) {
      out.push(
        <code key={key} className="rounded-[3px] bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[0.86em]">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (m[2]) {
      out.push(
        <strong key={key} className="font-medium text-ink">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (m[3]) {
      out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    } else if (m[5]) {
      out.push(
        <mark key={key} className="sketch-hl">
          {tok.slice(2, -2)}
        </mark>,
      );
    } else if (m[6]) {
      out.push(
        <span key={key} className="sketch-circle">
          {tok.slice(2, -2)}
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
            <path d={CIRCLE} fill="none" stroke="currentColor" strokeWidth="1.7" vectorEffect="non-scaling-stroke" />
          </svg>
        </span>,
      );
    } else {
      const [, label, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)!;
      const cls = 'text-ink underline decoration-[var(--line-strong)] underline-offset-4 hover:decoration-accent';
      out.push(
        href.startsWith('/') && !preview ? (
          <TransitionLink key={key} to={href} className={cls}>
            {label}
          </TransitionLink>
        ) : (
          <a key={key} href={href} target="_blank" rel="noreferrer" className={cls}>
            {label}
          </a>
        ),
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/** Scrolls to a section and puts its address in the URL, so it can be shared. */
export function jumpToHeading(e: MouseEvent<HTMLAnchorElement>, id: string) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  history.replaceState(history.state, '', `#${id}`);
  scrollToId(id);
}

/** A section heading with a "#" link that appears on hover or focus. */
function Heading({ level, id, text, preview }: { level: 2 | 3; id: string; text: string; preview?: boolean }) {
  const Tag = level === 2 ? 'h2' : 'h3';
  return (
    <Tag
      id={id}
      className={cn(
        'group scroll-mt-[calc(var(--nav-h)+2rem)] text-ink',
        level === 2 ? 't-h3 mt-16' : 'mt-12 text-[1.35rem] font-medium leading-snug tracking-[-0.02em]',
      )}
    >
      {text}
      {!preview && (
        <a
          href={`#${id}`}
          onClick={(e) => jumpToHeading(e, id)}
          className="ml-3 inline-block align-middle text-[0.7em] text-muted opacity-0 transition-opacity hover:text-accent focus-visible:opacity-100 group-hover:opacity-100"
          aria-label={`Link to section: ${text}`}
        >
          #
        </a>
      )}
    </Tag>
  );
}

/** A handwritten note: in the right margin on wide screens, under its paragraph otherwise. */
function MarginNote({ text, preview }: { text: string; preview?: boolean }) {
  return (
    <aside
      aria-label="Margin note"
      className={cn(
        'sketch-note mt-3 flex gap-2 pl-1 text-accent-ink',
        !preview && 'xl:absolute xl:left-[calc(100%+3rem)] xl:top-6 xl:mt-0 xl:w-[13.5rem] xl:pl-0',
      )}
    >
      <span aria-hidden="true" className={cn('shrink-0', !preview && 'xl:hidden')}>
        ↳
      </span>
      <span>
        <span aria-hidden="true" className={cn('hidden', !preview && 'xl:inline')}>
          ←{' '}
        </span>
        <Inline text={text} preview={preview} />
      </span>
    </aside>
  );
}

const CALLOUT: Record<CalloutKind, { label: string; className: string }> = {
  note: { label: 'Note', className: 'border-ink' },
  tip: { label: 'Tip', className: 'border-accent' },
  warning: { label: 'Warning', className: 'border-accent-ink bg-accent/[0.06]' },
};

/**
 * Renders a parsed post. The site passes `renderDemo` for the live demos; the
 * admin preview (`preview`) shows labelled stand-ins instead and opens links in
 * a new tab. Code arrives highlighted from the build (`html`); the preview shows
 * it plain.
 */
export function PostBody({
  blocks,
  renderDemo,
  preview,
}: {
  blocks: Block[];
  renderDemo?: (kind: PostDemoKind) => ReactNode;
  preview?: boolean;
}) {
  const render = (b: Block, i: number): ReactNode => {
    switch (b.type) {
      case 'p':
        return (
          <p key={i} className="mt-6 text-[1.125rem] leading-[1.75] text-ink-2">
            <Inline text={b.text} preview={preview} />
          </p>
        );
      case 'h2':
      case 'h3':
        return <Heading key={i} level={b.type === 'h2' ? 2 : 3} id={b.id} text={b.text} preview={preview} />;
      case 'code':
        return (
          <pre
            key={i}
            className="t-meta mt-8 overflow-x-auto border border-[var(--line)] bg-paper/70 p-5 text-[13px] leading-relaxed text-ink"
            tabIndex={0}
            aria-label={`${b.lang} code example`}
          >
            {b.html ? <code dangerouslySetInnerHTML={{ __html: b.html }} /> : <code>{b.code}</code>}
          </pre>
        );
      case 'formula':
        return (
          <p key={i} className="t-meta mt-8 border-l-2 border-accent bg-paper/50 px-5 py-4 text-[14px] text-ink">
            {b.text}
          </p>
        );
      case 'list': {
        const List = b.ordered ? 'ol' : 'ul';
        return (
          <List key={i} className={cn('mt-6 space-y-3', b.ordered && 'list-decimal pl-6 marker:text-muted')}>
            {b.items.map((item, j) => (
              <li key={j} className={cn('text-[1.075rem] leading-relaxed text-ink-2', !b.ordered && 'relative pl-7')}>
                {!b.ordered && <span className="absolute left-0 top-[0.8em] h-px w-4 bg-ink" aria-hidden="true" />}
                <Inline text={item} preview={preview} />
              </li>
            ))}
          </List>
        );
      }
      case 'callout':
        return (
          <aside
            key={i}
            aria-label={CALLOUT[b.kind].label}
            className={cn('mt-8 border-l-2 bg-paper/50 px-5 py-4', CALLOUT[b.kind].className)}
          >
            <p className="t-label text-[10px] text-ink">{CALLOUT[b.kind].label}</p>
            <p className="mt-2 text-[1.02rem] leading-relaxed text-ink-2">
              <Inline text={b.text} preview={preview} />
            </p>
          </aside>
        );
      case 'quote':
        return (
          <blockquote
            key={i}
            className="mt-10 border-l border-ink pl-6 text-[clamp(1.3rem,2.2vw,1.6rem)] leading-snug tracking-[-0.02em] text-ink"
          >
            <Inline text={b.text} preview={preview} />
          </blockquote>
        );
      case 'image':
        return (
          <figure key={i} className="my-10">
            <img
              src={b.src}
              alt={b.alt}
              loading="lazy"
              decoding="async"
              className="w-full border border-[var(--line)] bg-paper"
            />
            {b.caption && <figcaption className="t-meta mt-3 text-[12px] text-muted">{b.caption}</figcaption>}
          </figure>
        );
      case 'demo':
        return renderDemo && !preview ? (
          <div key={i} className="my-12 md:-mx-16 lg:-mx-32">
            {renderDemo(b.demo)}
          </div>
        ) : (
          <p
            key={i}
            className="t-label my-10 border border-dashed border-[var(--line-strong)] px-5 py-8 text-center text-muted"
          >
            Interactive demo · {postDemoLabels[b.demo]}
          </p>
        );
      case 'sketch':
        return (
          <figure key={i} className="my-12">
            <Sketch spec={b.sketch} />
            {b.sketch.caption && (
              <figcaption className="sketch-note mt-2 text-center text-muted">{b.sketch.caption}</figcaption>
            )}
          </figure>
        );
      case 'margin':
        return <MarginNote key={i} text={b.text} preview={preview} />;
    }
  };

  // A margin note is anchored to the block just before it.
  const out: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const next = blocks[i + 1];
    if (next?.type === 'margin') {
      out.push(
        <div key={i} className="relative">
          {render(blocks[i], i)}
          {render(next, i + 1)}
        </div>,
      );
      i++;
    } else out.push(render(blocks[i], i));
  }
  return <>{out}</>;
}
