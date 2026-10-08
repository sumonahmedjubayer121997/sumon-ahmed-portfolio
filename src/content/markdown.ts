/**
 * The small Markdown dialect blog posts are written in (in /admin) and stored in
 * Firestore as `posts/{slug}.body`.
 *
 *   ## Section heading
 *   Paragraphs separated by a blank line, with **bold**, *italic*, `code` and [links](/work/…).
 *   - list items
 *   ```python  (or ~~~)   code blocks
 *   $$ formula $$
 *   <Demo kind="tfidf" />   an interactive demo from the site
 *
 * Everything here is also valid MDX, so posts carry over unchanged when the blog
 * moves to MDX.
 */

export const postDemoKinds = ['tfidf', 'rag-pipeline', 'agent-pipeline'] as const;
export type PostDemoKind = (typeof postDemoKinds)[number];

export const postDemoLabels: Record<PostDemoKind, string> = {
  tfidf: 'TF-IDF recommender',
  'rag-pipeline': 'RAG pipeline',
  'agent-pipeline': 'Agent loop',
};

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'formula'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'demo'; demo: PostDemoKind };

const isDemo = (k: string): k is PostDemoKind => (postDemoKinds as readonly string[]).includes(k);

/** Parses a post body. Problems (unclosed blocks, unknown demos) are returned, never thrown. */
export function parseMarkdown(src: string): { blocks: Block[]; errors: string[] } {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  const errors: string[] = [];
  let para: string[] = [];
  let list: string[] | null = null;

  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
    if (list) blocks.push({ type: 'list', items: list });
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

    const heading = /^#{1,6}\s+(.+)$/.exec(t);
    if (heading) {
      flush();
      blocks.push({ type: 'h2', text: heading[1].trim() });
      continue;
    }

    const item = /^[-*]\s+(.+)$/.exec(t);
    if (item) {
      if (para.length) flush();
      (list ??= []).push(item[1].trim());
      continue;
    }

    if (!t) {
      flush();
      continue;
    }
    // An indented line continues the previous list item; anything else ends the list.
    if (list && /^\s/.test(line)) {
      list[list.length - 1] += ` ${t}`;
      continue;
    }
    if (list) flush();
    para.push(t);
  }
  flush();
  return { blocks, errors };
}

/** Inline markup removed — for word counts and plain-text previews. */
export const stripInline = (text: string) =>
  text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');

/** Minutes to read at ~220 words per minute (code counts too — it has to be read). */
export function readingTime(blocks: Block[]) {
  const text = blocks
    .map((b) => (b.type === 'list' ? b.items.join(' ') : b.type === 'code' ? b.code : b.type === 'demo' ? '' : b.text))
    .join(' ');
  const words = stripInline(text).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 220))} min`;
}
