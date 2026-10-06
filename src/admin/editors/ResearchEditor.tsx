import { collections, researchSchema, type Research } from '@/content/schema';
import { useDocEditor } from '../useEditors';
import { Field, Grid, LinesInput, NumberInput, Panel, Rows, SaveBar, TextArea, TextInput, issueFor } from '../ui';
import { EditorState, PageHeader, placeholderProps } from './common';

export default function ResearchEditor() {
  const ed = useDocEditor<Research>(collections.research.path, collections.research.id, researchSchema);
  const d = ed.draft;
  const confirm = (key: string) => ed.edit(() => undefined, key);

  return (
    <>
      <PageHeader title="Research" description="Your MSc dissertation, presented as a research artifact." />
      <EditorState state={ed.state} error={ed.error}>
        {d && (
          <div className="grid gap-6">
            <Panel title="Dissertation">
              <Field label="Title" error={issueFor(ed.issues, 'title')}>
                {(id) => (
                  <TextArea id={id} rows={2} value={d.title} onChange={(v) => ed.edit((x) => void (x.title = v))} />
                )}
              </Field>
              <Grid cols={4}>
                <Field label="Degree">
                  {(id) => <TextInput id={id} value={d.degree} onChange={(v) => ed.edit((x) => void (x.degree = v))} />}
                </Field>
                <Field label="Institution">
                  {(id) => (
                    <TextInput
                      id={id}
                      value={d.institution}
                      onChange={(v) => ed.edit((x) => void (x.institution = v))}
                    />
                  )}
                </Field>
                <Field label="Year" {...placeholderProps(d, 'year', confirm)}>
                  {(id) => (
                    <TextInput id={id} value={d.year} onChange={(v) => ed.edit((x) => void (x.year = v), 'year')} />
                  )}
                </Field>
                <Field label="Type">
                  {(id) => <TextInput id={id} value={d.type} onChange={(v) => ed.edit((x) => void (x.type = v))} />}
                </Field>
              </Grid>
              <Field label="Keywords" hint="One per line.">
                {(id) => (
                  <LinesInput
                    id={id}
                    rows={4}
                    value={d.keywords}
                    onChange={(v) => ed.edit((x) => void (x.keywords = v))}
                  />
                )}
              </Field>
            </Panel>

            <Panel title="Abstract">
              <Rows
                items={d.abstract}
                onChange={(v) => ed.edit((x) => void (x.abstract = v))}
                create={() => ''}
                itemLabel={(p) => p.slice(0, 60)}
                addLabel="Add paragraph"
                render={(p, _u, i) => (
                  <Field label="Paragraph">
                    {(id) => (
                      <TextArea id={id} rows={5} value={p} onChange={(v) => ed.edit((x) => void (x.abstract[i] = v))} />
                    )}
                  </Field>
                )}
              />
              <Field label="Ethics note">
                {(id) => (
                  <TextArea id={id} rows={2} value={d.ethics} onChange={(v) => ed.edit((x) => void (x.ethics = v))} />
                )}
              </Field>
            </Panel>

            <Panel
              title="Figure 1 — pipeline"
              description="A synthetic example post runs through your pipeline on the homepage."
            >
              <Field label="Example post (synthetic)">
                {(id) => (
                  <TextArea id={id} rows={2} value={d.sample} onChange={(v) => ed.edit((x) => void (x.sample = v))} />
                )}
              </Field>
              <Field
                label="Model output shown (0–1)"
                hint="Illustrative risk score in the last column of the figure."
                error={issueFor(ed.issues, 'riskScore')}
                {...placeholderProps(d, 'riskScore', confirm)}
              >
                {(id) => (
                  <NumberInput
                    id={id}
                    step={0.01}
                    min={0}
                    max={1}
                    value={d.riskScore}
                    onChange={(v) => ed.edit((x) => void (x.riskScore = v), 'riskScore')}
                  />
                )}
              </Field>
              <div className="grid gap-3">
                {d.figure.map((f, i) => (
                  <Grid key={f.id}>
                    <Field label={`Stage ${i + 1}`}>
                      {(id) => (
                        <TextInput
                          id={id}
                          value={f.label}
                          onChange={(v) => ed.edit((x) => void (x.figure[i].label = v))}
                        />
                      )}
                    </Field>
                    <Field label="Caption">
                      {(id) => (
                        <TextInput
                          id={id}
                          value={f.caption}
                          onChange={(v) => ed.edit((x) => void (x.figure[i].caption = v))}
                        />
                      )}
                    </Field>
                  </Grid>
                ))}
              </div>
            </Panel>

            <SaveBar
              dirty={ed.dirty}
              saving={ed.saving}
              issues={ed.issues}
              savedAt={ed.savedAt}
              onSave={() => void ed.save()}
              onRevert={ed.revert}
            />
          </div>
        )}
      </EditorState>
    </>
  );
}
