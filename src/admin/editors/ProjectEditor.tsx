import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  collections,
  conceptIds,
  demoKinds,
  previewKinds,
  projectSchema,
  type ConceptId,
  type Project,
} from '@/content/schema';
import { loadDoc, removeDoc } from '../data';
import { slugify, useDocEditor } from '../useEditors';
import {
  Button,
  Field,
  Grid,
  LinesInput,
  NumberInput,
  Panel,
  Rows,
  SaveBar,
  Select,
  TextArea,
  TextInput,
  Toggle,
  issueFor,
} from '../ui';
import { EditorState, PageHeader, placeholderProps } from './common';
import { FigureEditor, blankFigure } from './FigureEditor';

const CONCEPT_LABELS: Record<ConceptId, string> = {
  ai: 'AI',
  rag: 'RAG',
  llm: 'LLM',
  ml: 'Machine learning',
  data: 'Data',
  software: 'Software',
};

const template = (): Project => ({
  slug: '',
  index: '',
  title: '',
  discipline: '',
  summary: '',
  year: String(new Date().getFullYear()),
  role: '',
  type: '',
  stack: [],
  concepts: ['ml'],
  position: { x: 0.63, y: 0.5, align: 'left' },
  preview: 'interface',
  problem: '',
  approach: [],
  pipeline: [],
  outcomes: [],
  decisions: [],
  figures: [],
  links: [],
  repoUrl: '',
  liveUrl: '',
  order: 99,
  published: false,
  placeholders: [],
});

export default function ProjectEditor() {
  const { slug = '' } = useParams();
  const isNew = slug === 'new';
  const navigate = useNavigate();
  const ed = useDocEditor<Project>(collections.projects, isNew ? null : slug, projectSchema);
  const [deleting, setDeleting] = useState(false);
  const d = ed.draft;
  const confirm = (key: string) => ed.edit(() => undefined, key);

  useEffect(() => {
    if (isNew) ed.create(template());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once per "new" visit
  }, [isNew]);

  const save = async () => {
    if (!d) return;
    if (isNew) {
      const id = slugify(d.slug || d.title);
      if (!id) return;
      if (await loadDoc(collections.projects, id)) {
        ed.edit((x) => void (x.slug = `${id}-2`));
        return;
      }
      const ok = await ed.save(id, { slug: id });
      if (ok) navigate(`/admin/projects/${id}`, { replace: true });
      return;
    }
    await ed.save();
  };

  const remove = async () => {
    if (!d || isNew || !window.confirm(`Delete “${d.title}”? This cannot be undone.`)) return;
    setDeleting(true);
    await removeDoc(collections.projects, slug);
    navigate('/admin/projects', { replace: true });
  };

  return (
    <>
      <PageHeader
        title={isNew ? 'New project' : (d?.title ?? 'Project')}
        description={
          <Link to="/admin/projects" className="underline">
            ← All projects
          </Link>
        }
        actions={
          !isNew && d ? (
            <Button variant="danger" onClick={remove} disabled={deleting}>
              Delete project
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
                  hint={isNew ? `/work/${slugify(d.slug || d.title) || '…'}` : 'Fixed after creation.'}
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
                <Field label="Number" hint="e.g. 05" error={issueFor(ed.issues, 'index')}>
                  {(id) => <TextInput id={id} value={d.index} onChange={(v) => ed.edit((x) => void (x.index = v))} />}
                </Field>
                <Field label="Discipline" hint="e.g. Machine Learning · NLP" error={issueFor(ed.issues, 'discipline')}>
                  {(id) => (
                    <TextInput id={id} value={d.discipline} onChange={(v) => ed.edit((x) => void (x.discipline = v))} />
                  )}
                </Field>
                <Field label="Year" error={issueFor(ed.issues, 'year')}>
                  {(id) => <TextInput id={id} value={d.year} onChange={(v) => ed.edit((x) => void (x.year = v))} />}
                </Field>
                <Field label="Your role" error={issueFor(ed.issues, 'role')}>
                  {(id) => <TextInput id={id} value={d.role} onChange={(v) => ed.edit((x) => void (x.role = v))} />}
                </Field>
                <Field label="Project type" error={issueFor(ed.issues, 'type')}>
                  {(id) => <TextInput id={id} value={d.type} onChange={(v) => ed.edit((x) => void (x.type = v))} />}
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
              <Field label="One-sentence summary" error={issueFor(ed.issues, 'summary')}>
                {(id) => (
                  <TextArea id={id} rows={2} value={d.summary} onChange={(v) => ed.edit((x) => void (x.summary = v))} />
                )}
              </Field>
              <Field label="Stack" hint="One technology per line.">
                {(id) => (
                  <LinesInput id={id} rows={4} value={d.stack} onChange={(v) => ed.edit((x) => void (x.stack = v))} />
                )}
              </Field>
            </Panel>

            <Panel title="Story">
              <Field label="Problem" error={issueFor(ed.issues, 'problem')}>
                {(id) => (
                  <TextArea id={id} rows={3} value={d.problem} onChange={(v) => ed.edit((x) => void (x.problem = v))} />
                )}
              </Field>
              <Field label="Approach">
                {() => (
                  <Rows
                    items={d.approach}
                    onChange={(v) => ed.edit((x) => void (x.approach = v))}
                    create={() => ({ title: '', body: '' })}
                    itemLabel={(a) => a.title}
                    addLabel="Add step"
                    render={(a, update) => (
                      <>
                        <Field label="Step">
                          {(id) => (
                            <TextInput id={id} value={a.title} onChange={(v) => update((y) => void (y.title = v))} />
                          )}
                        </Field>
                        <Field label="What you did">
                          {(id) => (
                            <TextArea
                              id={id}
                              rows={2}
                              value={a.body}
                              onChange={(v) => update((y) => void (y.body = v))}
                            />
                          )}
                        </Field>
                      </>
                    )}
                  />
                )}
              </Field>
              <Field label="System pipeline" hint="One stage per line, in order.">
                {(id) => (
                  <LinesInput
                    id={id}
                    rows={5}
                    value={d.pipeline}
                    onChange={(v) => ed.edit((x) => void (x.pipeline = v))}
                  />
                )}
              </Field>
            </Panel>

            <Panel
              title="Results"
              description="Real numbers only — recruiters will ask about them. Prefer metrics with context (e.g. macro F1 on a held-out set)."
            >
              <Field label="Outcomes" {...placeholderProps(d, 'outcomes', confirm)}>
                {() => (
                  <Rows
                    items={d.outcomes}
                    onChange={(v) => ed.edit((x) => void (x.outcomes = v), 'outcomes')}
                    create={() => ({ label: '', value: '' })}
                    itemLabel={(o) => `${o.label} ${o.value}`}
                    addLabel="Add metric"
                    render={(o, update) => (
                      <Grid>
                        <Field label="Metric">
                          {(id) => (
                            <TextInput id={id} value={o.label} onChange={(v) => update((y) => void (y.label = v))} />
                          )}
                        </Field>
                        <Field label="Value">
                          {(id) => (
                            <TextInput id={id} value={o.value} onChange={(v) => update((y) => void (y.value = v))} />
                          )}
                        </Field>
                      </Grid>
                    )}
                  />
                )}
              </Field>
            </Panel>

            <Panel
              title="Evaluation figures"
              description="Confusion matrices and PR curves are drawn from your numbers; images upload to Firebase Storage."
            >
              <Field
                label="Figures"
                error={issueFor(ed.issues, 'figures')}
                {...placeholderProps(d, 'figures', confirm)}
              >
                {() => (
                  <Rows
                    items={d.figures}
                    onChange={(v) => ed.edit((x) => void (x.figures = v), 'figures')}
                    create={() => blankFigure('confusion-matrix')}
                    itemLabel={(f) => f.type.replace('-', ' ')}
                    addLabel="Add figure"
                    render={(f, _u, i) => (
                      <FigureEditor
                        figure={f}
                        folder={`projects/${d.slug || 'new'}`}
                        onChange={(next) => ed.edit((x) => void (x.figures[i] = next), 'figures')}
                      />
                    )}
                  />
                )}
              </Field>
            </Panel>

            <Panel
              title="Decisions & trade-offs"
              description="Two to four choices you made and why — what you gave up, what you'd change."
            >
              <Field label="Decisions" {...placeholderProps(d, 'decisions', confirm)}>
                {() => (
                  <Rows
                    items={d.decisions}
                    onChange={(v) => ed.edit((x) => void (x.decisions = v), 'decisions')}
                    create={() => ({ title: '', body: '' })}
                    itemLabel={(x) => x.title}
                    addLabel="Add decision"
                    render={(dec, update) => (
                      <>
                        <Field label="Decision">
                          {(id) => (
                            <TextInput id={id} value={dec.title} onChange={(v) => update((y) => void (y.title = v))} />
                          )}
                        </Field>
                        <Field label="Reasoning">
                          {(id) => (
                            <TextArea
                              id={id}
                              rows={3}
                              value={dec.body}
                              onChange={(v) => update((y) => void (y.body = v))}
                            />
                          )}
                        </Field>
                      </>
                    )}
                  />
                )}
              </Field>
            </Panel>

            <Panel title="Links">
              <Grid>
                <Field
                  label="Source code (GitHub)"
                  error={issueFor(ed.issues, 'repoUrl')}
                  {...placeholderProps(d, 'repoUrl', confirm)}
                >
                  {(id) => (
                    <TextInput
                      id={id}
                      type="url"
                      value={d.repoUrl}
                      placeholder="https://github.com/…"
                      onChange={(v) => ed.edit((x) => void (x.repoUrl = v), 'repoUrl')}
                    />
                  )}
                </Field>
                <Field label="Live project" error={issueFor(ed.issues, 'liveUrl')}>
                  {(id) => (
                    <TextInput
                      id={id}
                      type="url"
                      value={d.liveUrl}
                      placeholder="https://…"
                      onChange={(v) => ed.edit((x) => void (x.liveUrl = v))}
                    />
                  )}
                </Field>
              </Grid>
              <Field label="Other links" hint="Internal paths (/blog/…) or full URLs.">
                {() => (
                  <Rows
                    items={d.links}
                    onChange={(v) => ed.edit((x) => void (x.links = v))}
                    create={() => ({ label: '', href: '' })}
                    itemLabel={(l) => l.label}
                    addLabel="Add link"
                    render={(l, update) => (
                      <Grid>
                        <Field label="Label">
                          {(id) => (
                            <TextInput id={id} value={l.label} onChange={(v) => update((y) => void (y.label = v))} />
                          )}
                        </Field>
                        <Field label="Link">
                          {(id) => (
                            <TextInput id={id} value={l.href} onChange={(v) => update((y) => void (y.href = v))} />
                          )}
                        </Field>
                      </Grid>
                    )}
                  />
                )}
              </Field>
            </Panel>

            <Panel title="Presentation" description="How the project appears in the homepage system.">
              <Grid cols={3}>
                <Field label="Preview artwork">
                  {(id) => (
                    <Select
                      id={id}
                      value={d.preview}
                      options={previewKinds.map((p) => ({ value: p, label: p }))}
                      onChange={(v) => v && ed.edit((x) => void (x.preview = v))}
                    />
                  )}
                </Field>
                <Field label="Interactive demo">
                  {(id) => (
                    <Select
                      id={id}
                      value={d.demo ?? ''}
                      options={[
                        { value: '' as const, label: 'None' },
                        ...demoKinds.map((k) => ({ value: k, label: k })),
                      ]}
                      onChange={(v) => ed.edit((x) => void (x.demo = v || undefined))}
                    />
                  )}
                </Field>
                <Field label="Label side">
                  {(id) => (
                    <Select
                      id={id}
                      value={d.position.align}
                      options={[
                        { value: 'left', label: 'Text right of the node' },
                        { value: 'right', label: 'Text left of the node' },
                      ]}
                      onChange={(v) => v && ed.edit((x) => void (x.position.align = v))}
                    />
                  )}
                </Field>
                <Field label="Position x (0–1)">
                  {(id) => (
                    <NumberInput
                      id={id}
                      step={0.01}
                      min={0}
                      max={1}
                      value={d.position.x}
                      onChange={(v) => ed.edit((x) => void (x.position.x = v))}
                    />
                  )}
                </Field>
                <Field label="Position y (0–1)">
                  {(id) => (
                    <NumberInput
                      id={id}
                      step={0.01}
                      min={0}
                      max={1}
                      value={d.position.y}
                      onChange={(v) => ed.edit((x) => void (x.position.y = v))}
                    />
                  )}
                </Field>
              </Grid>
              <fieldset className="grid gap-2">
                <legend className="t-label mb-1 text-[10px] text-ink-2">Connected concepts</legend>
                <div className="flex flex-wrap gap-4">
                  {conceptIds.map((c) => (
                    <label key={c} className="inline-flex items-center gap-2 text-[0.92rem]">
                      <input
                        type="checkbox"
                        checked={d.concepts.includes(c)}
                        onChange={(e) =>
                          ed.edit(
                            (x) =>
                              void (x.concepts = e.target.checked
                                ? [...x.concepts, c]
                                : x.concepts.filter((k) => k !== c)),
                          )
                        }
                      />
                      {CONCEPT_LABELS[c]}
                    </label>
                  ))}
                </div>
                {issueFor(ed.issues, 'concepts') && (
                  <p className="text-[0.8rem] text-[#8f1d17]">{issueFor(ed.issues, 'concepts')}</p>
                )}
              </fieldset>
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
