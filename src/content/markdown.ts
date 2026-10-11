/**
 * The small Markdown dialect blog posts are written in (in /admin) and stored in
 * Firestore as `posts/{slug}.body`.
 *
 *   ## Section heading            ### Subheading
 *   Paragraphs separated by a blank line, with **bold**, *italic*, `code` and [links](/work/…).
 *   - bullet items                1. numbered items
 *   ```python  (or ~~~)   code blocks (highlighted at build time)
 *   $$ formula $$
 *   > [!NOTE]   (or [!TIP], [!WARNING])  a callout; a plain `>` is a quote
 *   ![What the image shows](https://…/image.png "Optional caption")
 *   <Demo kind="tfidf" />   an interactive demo from the site
 *   <Sketch template="pipeline" labels="Docs, Chunks, LLM" />   a hand-drawn diagram (pipeline, cycle, compare)
 *   <Sketch chart="bar" data="Fixed: 0.62, Headings: 0.81" />   a hand-drawn chart of your own numbers
 *   > [!MARGIN] note   a handwritten note beside the paragraph above it
 *   ==highlight== and ((0.81)) inline   a highlighter stroke, a circled number
 *
 * Everything here is also valid MDX (callouts use GitHub's alert syntax), so
 * posts carry over unchanged if the blog moves to MDX.
 */

import { parseSketchTag, type SketchSpec } from './sketch';

export const postDemoKinds = ['tfidf', 'rag-pipeline', 'agent-pipeline'] as const;
export type PostDemoKind = (typeof postDemoKinds)[number];

export const postDemoLabels: Record<PostDemoKind, string> = {
  tfidf: 'TF-IDF recommender',
  'rag-pipeline': 'RAG pipeline',
  'agent-pipeline': 'Agent loop',
};

export const calloutKinds = ['note', 'tip', 'warning'] as const;
export type CalloutKind = (typeof calloutKinds)[number];

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2' | 'h3'; text: string; id: string }
  /** `html` = syntax-highlighted lines, added at build time (scripts/content/highlight.ts). */
  | { type: 'code'; lang: string; code: string; html?: string }
  | { type: 'formula'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'callout'; kind: CalloutKind; text: string }
  | { type: 'quote'; text: string }
  | { type: 'image'; src: string; alt: string; caption?: string }
  | { type: 'demo'; demo: PostDemoKind }
  | { type: 'sketch'; sketch: SketchSpec }
  /** A handwritten note shown beside the block before it (below it on narrow screens). */
  | { type: 'margin'; text: string };

const isDemo = (k: string): k is PostDemoKind => (postDemoKinds as readonly string[]).includes(k);

/** URL-safe id for a heading, unique within the post. */
function headingId(text: string, used: Set<string>) {
  const base =
    stripInline(text)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'section';
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

/** Parses a post body. Problems (unclosed blocks, unknown demos) are returned, never thrown. */
export function parseMarkdown(src: string): { blocks: Block[]; errors: string[] } {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  const errors: string[] = [];
  const ids = new Set<string>();
  let para: string[] = [];
  let list: { items: string[]; ordered: boolean } | null = null;

  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
    if (list)
      blocks.push(
        list.ordered ? { type: 'list', items: list.items, ordered: true } : { type: 'list', items: list.items },
      );
    para = [];
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    const at = `Line ${i + 1}`;

    const fence = /^(```|~~~)\s*([\w+#-]*)\s*$/.exec(t);
    if (fence) {
      flush();
      const code: string[] = [];
      let closed = false;
      for (i++; i < lines.length; i++) {
        if (lines[i].trim() === fence[1]) {
          closed = true;
          break;
        }
        code.push(lines[i]);
      }
      if (!closed) errors.push(`${at}: code block is never closed — add a line with ${fence[1]}`);
      blocks.push({ type: 'code', lang: fence[2] || 'text', code: code.join('\n') });
      continue;
    }

    if (t.startsWith('$$')) {
      flush();
      let text = t.slice(2);
      if (/\$\$\s*$/.test(text)) text = text.replace(/\$\$\s*$/, '');
      else {
        const rest: string[] = [text];
        let closed = false;
        for (i++; i < lines.length; i++) {
          const l = lines[i].trim();
          if (l.endsWith('$$')) {
            rest.push(l.slice(0, -2));
            closed = true;
            break;
          }
          rest.push(l);
        }
        if (!closed) errors.push(`${at}: formula is never closed — end it with $$`);
        text = rest.join(' ');
      }
      if (text.trim()) blocks.push({ type: 'formula', text: text.trim() });
      continue;
    }

    if (t.startsWith('>')) {
      flush();
      const quoted: string[] = [];
      for (; i < lines.length && lines[i].trim().startsWith('>'); i++)
        quoted.push(lines[i].trim().replace(/^>\s?/, ''));
      i--;
      const alert = /^\[!(NOTE|TIP|WARNING|MARGIN)\]\s*(.*)$/i.exec(quoted[0] ?? '');
      const text = (alert ? [alert[2], ...quoted.slice(1)] : quoted).filter(Boolean).join(' ').trim();
      const margin = alert?.[1].toUpperCase() === 'MARGIN';
      if (!text) errors.push(`${at}: the ${margin ? 'margin note' : alert ? 'callout' : 'quote'} is empty`);
      else if (margin) {
        const prev = blocks.at(-1);
        if (!prev || prev.type === 'margin' || prev.type === 'h2' || prev.type === 'h3')
          errors.push(`${at}: a margin note goes right after the paragraph it comments on`);
        else blocks.push({ type: 'margin', text });
      } else if (alert) blocks.push({ type: 'callout', kind: alert[1].toLowerCase() as CalloutKind, text });
      else blocks.push({ type: 'quote', text });
      continue;
    }

    const image = /^!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)$/.exec(t);
    if (image) {
      flush();
      const [, alt, src, caption] = image;
      if (!alt.trim()) errors.push(`${at}: describe the image inside ![…] — screen-reader users rely on it`);
      else if (!/^(https:\/\/|\/)/.test(src)) errors.push(`${at}: image address must start with https:// or /`);
      else
        blocks.push(
          caption ? { type: 'image', src, alt: alt.trim(), caption } : { type: 'image', src, alt: alt.trim() },
        );
      continue;
    }

    if (t.startsWith('<Demo')) {
      flush();
      const kind = /^<Demo\s+kind=["']([\w-]+)["']\s*\/>$/.exec(t)?.[1];
      if (kind && isDemo(kind)) blocks.push({ type: 'demo', demo: kind });
      else
        errors.push(
          kind
            ? `${at}: unknown demo “${kind}” — use one of ${postDemoKinds.join(', ')}`
            : `${at}: write demos as <Demo kind="tfidf" />`,
        );
      continue;
    }

    if (t.startsWith('<Sketch')) {
      flush();
      const r = parseSketchTag(t);
      if ('spec' in r) blocks.push({ type: 'sketch', sketch: r.spec });
      else errors.push(`${at}: ${r.error}`);
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(t);
    if (heading) {
      flush();
      const text = heading[2].trim();
      blocks.push({ type: heading[1].length >= 3 ? 'h3' : 'h2', text, id: headingId(text, ids) });
      continue;
    }

    const bullet = /^[-*]\s+(.+)$/.exec(t);
    const numbered = /^\d+[.)]\s+(.+)$/.exec(t);
    const item = bullet ?? numbered;
    if (item) {
      const ordered = !bullet;
      if (para.length || (list && list.ordered !== ordered)) flush();
      (list ??= { items: [], ordered }).items.push(item[1].trim());
      continue;
    }

    if (!t) {
      flush();
      continue;
    }
    // An indented line continues the previous list item; anything else ends the list.
    if (list && /^\s/.test(line)) {
      list.items[list.items.length - 1] += ` ${t}`;
      continue;
    }
    if (list) flush();
    para.push(t);
  }
  flush();
  return { blocks, errors };
}

/** The post's sections, for a table of contents. */
export const headings = (blocks: Block[]) =>
  blocks.filter((b): b is Extract<Block, { type: 'h2' | 'h3' }> => b.type === 'h2' || b.type === 'h3');

/** Inline markup removed — for word counts and plain-text previews. */
export function stripInline(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/==(\S[^=]*?\S|\S)==/g, '$1')
    .replace(/\(\((\S[^()]*?\S|\S)\)\)/g, '$1');
}

/** Minutes to read at ~220 words per minute (code counts too — it has to be read). */
export function readingTime(blocks: Block[]) {
  const text = blocks
    .map((b) =>
      b.type === 'list'
        ? b.items.join(' ')
        : b.type === 'code'
          ? b.code
          : b.type === 'demo' || b.type === 'sketch'
            ? ''
            : b.type === 'image'
              ? (b.caption ?? '')
              : b.text,
    )
    .join(' ');
  const words = stripInline(text).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 220))} min`;
}
