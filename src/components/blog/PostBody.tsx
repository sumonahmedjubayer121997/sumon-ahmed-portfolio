import type { ReactNode } from 'react';
import { postDemoLabels, type Block, type PostDemoKind } from '@/content/markdown';
import { TransitionLink } from '@/components/ui/TransitionLink';

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)\s]+\))/g;

/** **bold**, *italic*, `code` and [links](…) inside a paragraph or list item. */
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

/**
 * Renders a parsed post. The site passes `renderDemo` for the live demos; the
 * admin preview (`preview`) shows labelled stand-ins instead and opens links in
 * a new tab.
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
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'p':
            return (
              <p key={i} className="mt-6 text-[1.125rem] leading-[1.75] text-ink-2">
                <Inline text={b.text} preview={preview} />
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
                {b.items.map((item, j) => (
                  <li key={j} className="relative pl-7 text-[1.075rem] leading-relaxed text-ink-2">
                    <span className="absolute left-0 top-[0.8em] h-px w-4 bg-ink" aria-hidden="true" />
                    <Inline text={item} preview={preview} />
                  </li>
                ))}
              </ul>
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
        }
      })}
    </>
  );
}
