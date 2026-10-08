import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { collections, postSchema, type Post } from '@/content/schema';
import { parseMarkdown, postDemoKinds, readingTime } from '@/content/markdown';
import { PostBody } from '@/components/blog/PostBody';
import { cn } from '@/lib/cn';
import { loadDoc, removeDoc } from '../data';
import { slugify, useDocEditor } from '../useEditors';
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

const template = (): Post => ({
  slug: '',
  index: '',
  title: '',
  excerpt: '',
  date: new Date().toISOString().slice(0, 10),
  updated: '',
  tags: [],
  body: '',
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
];

const today = () => new Date().toISOString().slice(0, 10);

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
      if (ok) navigate(`/admin/posts/${id}`, { replace: true });
      return;
    }
    await ed.save();
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
