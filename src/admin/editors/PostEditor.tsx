import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { collections, postSchema, type Post } from '@/content/schema';
import { parseMarkdown, postDemoKinds, readingTime } from '@/content/markdown';
import { PostBody } from '@/components/blog/PostBody';
import { cn } from '@/lib/cn';
import { loadCollection, loadDoc, removeDoc } from '../data';
import { slugify, useDocEditor } from '../useEditors';
import { AiPanel, moveNotes, type AiOutcome } from '../ai/AiPanel';
import { nextIndex } from '../ai/guards';
import {
  Button,
  Field,
  Grid,
  LinesInput,
  NumberInput,
  Panel,
  SaveBar,
  TextArea,
  TextInput,
  Toggle,
  issueFor,
} from '../ui';
import { EditorState, PageHeader, placeholderProps } from './common';
import { SketchField } from './SketchField';

const template = (): Post => ({
  slug: '',
  index: '',
  title: '',
  excerpt: '',
  date: new Date().toISOString().slice(0, 10),
  updated: '',
  tags: [],
  body: '',
  sketch: null,
  order: 99,
  published: false,
  placeholders: [],
});

const SYNTAX: Array<[string, string]> = [
  ['## Heading', 'section (3 or more make a table of contents)'],
  ['### Subheading', 'subsection'],
  ['**bold**  *italic*  `code`', 'inline'],
  ['[label](/work/rag-system)', 'link (site path or full URL)'],
  ['- item', 'bullet list'],
  ['1. item', 'numbered list'],
  ['~~~python … ~~~', 'code block, highlighted on the site (``` also works)'],
  ['$$ a · b $$', 'formula'],
  ['> [!NOTE] text', 'callout ([!TIP] and [!WARNING] too)'],
  ['> text', 'quote'],
  ['![What it shows](https://…/image.png "Caption")', 'image (describe it for screen readers)'],
  [`<Demo kind="tfidf" />`, `live demo: ${postDemoKinds.join(', ')}`],
  ['==key sentence==', 'hand-drawn highlighter'],
  ['((0.81))', 'circle a number or word'],
  ['> [!MARGIN] note', 'handwritten note beside the paragraph above'],
  ['<Sketch template="pipeline" labels="Docs, Chunks, LLM" />', 'hand-drawn diagram (pipeline, cycle, compare)'],
  ['<Sketch chart="bar" data="Fixed: 0.62, Headings: 0.81" />', 'hand-drawn chart of your own numbers'],
];

const today = () => new Date().toISOString().slice(0, 10);

const NOTES_EXAMPLE = `e.g.
rag chunking - fixed 500 token chunks vs splitting on headings
heading split better: hit rate 0.62 → 0.81 on 40 hand-written questions
tables in PDFs get mangled, convert to markdown first
code: def chunk(md): return md.split("\n## ")`;

export default function PostEditor() {
  const { slug = '' } = useParams();
  const isNew = slug === 'new';
  const navigate = useNavigate();
  const ed = useDocEditor<Post>(collections.posts, isNew ? null : slug, postSchema);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const d = ed.draft;
  const confirm = (key: string) => ed.edit(() => undefined, key);
  const parsed = useMemo(() => parseMarkdown(d?.body ?? ''), [d?.body]);

  useEffect(() => {
    if (isNew) ed.create(template());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once per "new" visit
  }, [isNew]);

  const save = async () => {
    if (!d) return;
    if (isNew) {
      const id = slugify(d.slug || d.title);
      if (!id) return;
      if (await loadDoc(collections.posts, id)) {
        ed.edit((x) => void (x.slug = `${id}-2`));
        return;
      }
      const ok = await ed.save(id, { slug: id });
      if (ok) {
        moveNotes('posts', 'new', id);
        navigate(`/admin/posts/${id}`, { replace: true });
      }
      return;
    }
    await ed.save();
  };

  /** AI: organise rough notes into title, excerpt, tags and body (number too, if empty). */
  const organize = async (notes: string): Promise<AiOutcome> => {
    const [{ organizePost }, all] = await Promise.all([
      import('../ai/organize'),
      loadCollection<Post>(collections.posts),
    ]);
    const others = all.filter((p) => p.slug !== d?.slug);
    const example = others.find((p) => p.published) ?? others[0];
    const s = await organizePost(notes, {
      tags: [...new Set(others.flatMap((p) => p.tags))],
      titles: others.map((p) => p.title),
      example: example && { title: example.title, body: example.body },
    });
    let before: Post | null = null;
    const filled = ['title', 'excerpt', 'tags', 'body'];
    if (!d?.index) filled.push('number');
    ed.edit((x) => {
      before = structuredClone(x);
      if (s.title) x.title = s.title;
      if (s.excerpt) x.excerpt = s.excerpt;
      if (s.tags.length) x.tags = s.tags;
      if (s.body) x.body = s.body;
      if (!x.index) x.index = nextIndex(all.map((p) => p.index));
    }, 'body');
    return {
      ...s,
      filled,
      undo: () => ed.edit((x) => void (before && Object.assign(x, before))),
    };
  };

  const remove = async () => {
    if (!d || isNew || !window.confirm(`Delete “${d.title}”? This cannot be undone.`)) return;
    setDeleting(true);
    await removeDoc(collections.posts, slug);
    navigate('/admin/posts', { replace: true });
  };

  return (
    <>
      <PageHeader
        title={isNew ? 'New post' : (d?.title ?? 'Post')}
        description={
          <Link to="/admin/posts" className="underline">
            ← All posts
          </Link>
        }
        actions={
          !isNew && d ? (
            <Button variant="danger" onClick={remove} disabled={deleting}>
              Delete post
            </Button>
          ) : undefined
        }
      />
      <EditorState state={ed.state} error={ed.error}>
        {d && (
          <div className="grid gap-6">
            <AiPanel
              kind="posts"
              id={isNew ? 'new' : slug}
              noun="post"
              example={NOTES_EXAMPLE}
              run={organize}
              onUseTitle={(t) => ed.edit((x) => void (x.title = t))}
            />
            <Panel title="Basics">
              <Grid cols={3}>
                <Field label="Title" error={issueFor(ed.issues, 'title')}>
                  {(id) => <TextInput id={id} value={d.title} onChange={(v) => ed.edit((x) => void (x.title = v))} />}
                </Field>
                <Field
                  label="URL slug"
                  hint={isNew ? `/blog/${slugify(d.slug || d.title) || '…'}` : 'Fixed after creation.'}
                  error={issueFor(ed.issues, 'slug')}
                >
                  {(id) =>
                    isNew ? (
                      <TextInput id={id} value={d.slug} onChange={(v) => ed.edit((x) => void (x.slug = slugify(v)))} />
                    ) : (
                      <TextInput id={id} value={d.slug} readOnly onChange={() => undefined} />
                    )
                  }
                </Field>
                <Field label="Number" hint="e.g. 04" error={issueFor(ed.issues, 'index')}>
                  {(id) => <TextInput id={id} value={d.index} onChange={(v) => ed.edit((x) => void (x.index = v))} />}
                </Field>
                <Field
                  label="Date"
                  hint={
                    d.date > today() ? 'Scheduled: appears with the first publish on or after this date.' : undefined
                  }
                  error={issueFor(ed.issues, 'date')}
                >
                  {(id) => (
                    <TextInput id={id} type="date" value={d.date} onChange={(v) => ed.edit((x) => void (x.date = v))} />
                  )}
                </Field>
                <Field
                  label="Last updated"
                  hint="Optional — set it when you revise a published post."
                  error={issueFor(ed.issues, 'updated')}
                >
                  {(id) => (
                    <TextInput
                      id={id}
                      type="date"
                      value={d.updated ?? ''}
                      onChange={(v) => ed.edit((x) => void (x.updated = v))}
                    />
                  )}
                </Field>
                <Field label="Order" hint="Lower comes first.">
                  {(id) => <NumberInput id={id} value={d.order} onChange={(v) => ed.edit((x) => void (x.order = v))} />}
                </Field>
                <div className="self-end pb-2">
                  <Toggle
                    label="Published"
                    checked={d.published}
                    onChange={(v) => ed.edit((x) => void (x.published = v))}
                  />
                </div>
              </Grid>
              <Field
                label="Excerpt"
                hint="One sentence for the list and link previews."
                error={issueFor(ed.issues, 'excerpt')}
              >
                {(id) => (
                  <TextArea id={id} rows={2} value={d.excerpt} onChange={(v) => ed.edit((x) => void (x.excerpt = v))} />
                )}
              </Field>
              <Field label="Tags" hint="One per line.">
                {(id) => (
                  <LinesInput id={id} rows={3} value={d.tags} onChange={(v) => ed.edit((x) => void (x.tags = v))} />
                )}
              </Field>
            </Panel>

            <SketchField
              value={d.sketch ?? null}
              onChange={(v) => ed.edit((x) => void (x.sketch = v))}
              post={{ title: d.title, excerpt: d.excerpt, body: d.body }}
            />

            <Panel
              title="Post"
              description={`${readingTime(parsed.blocks)} read · ${parsed.blocks.length} blocks`}
              actions={
                <div role="group" aria-label="Editor view" className="flex gap-1">
                  {(['write', 'preview'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={tab === t}
                      onClick={() => setTab(t)}
                      className={cn(
                        't-label rounded-full px-3 py-1.5 text-[10px]',
                        tab === t ? 'bg-ink text-ivory' : 'text-muted hover:text-ink',
                      )}
                    >
                      {t === 'write' ? 'Write' : 'Preview'}
                    </button>
                  ))}
                </div>
              }
            >
              {tab === 'write' ? (
                <>
                  <Field
                    label="Body (Markdown)"
                    error={issueFor(ed.issues, 'body') ?? parsed.errors[0]}
                    {...placeholderProps(d, 'body', confirm)}
                  >
                    {(id) => (
                      <TextArea
                        id={id}
                        rows={22}
                        mono
                        value={d.body}
                        onChange={(v) => ed.edit((x) => void (x.body = v), 'body')}
                      />
                    )}
                  </Field>
                  <details className="text-[0.85rem] text-muted">
                    <summary className="t-label cursor-pointer text-[10px] hover:text-ink">Formatting help</summary>
                    <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-[auto_1fr]">
                      {SYNTAX.map(([code, what]) => (
                        <div key={code} className="contents">
                          <dt className="font-mono text-[0.8rem] text-ink">{code}</dt>
                          <dd>{what}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </>
              ) : (
                <div className="bg-ivory">
                  <h1 className="text-[clamp(1.8rem,3vw,2.6rem)] font-medium leading-[1.05] tracking-[-0.035em]">
                    {d.title || 'Untitled'}
                  </h1>
                  {d.excerpt && <p className="mt-4 max-w-[52ch] text-[1.05rem] text-ink-2">{d.excerpt}</p>}
                  <div className="mt-6 max-w-[68ch] border-t border-[var(--line)] pt-2">
                    {parsed.blocks.length ? (
                      <PostBody blocks={parsed.blocks} preview />
                    ) : (
                      <p className="mt-6 text-muted">Nothing written yet.</p>
                    )}
                  </div>
                </div>
              )}
            </Panel>

            <SaveBar
              dirty={ed.dirty}
              saving={ed.saving}
              issues={ed.issues}
              savedAt={ed.savedAt}
              onSave={() => void save()}
              onRevert={ed.revert}
            />
          </div>
        )}
      </EditorState>
    </>
  );
}
