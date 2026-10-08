import { collections, siteSchema, type Site } from '@/content/schema';
import { useDocEditor } from '../useEditors';
import {
  Field,
  Grid,
  LinesInput,
  NumberInput,
  Panel,
  Rows,
  SaveBar,
  TextArea,
  TextInput,
  Toggle,
  issueFor,
} from '../ui';
import { CvField } from './CvField';
import { EditorState, PageHeader, placeholderProps } from './common';

export default function ProfileEditor() {
  const ed = useDocEditor<Site>(collections.site.path, collections.site.id, siteSchema);
  const d = ed.draft;
  const confirm = (key: string) => ed.edit(() => undefined, key);

  return (
    <>
      <PageHeader title="Profile" description="Your name, hero statement, contact details and the About section." />
      <EditorState state={ed.state} error={ed.error}>
        {d && (
          <div className="grid gap-6">
            <Panel title="Identity">
              <Grid>
                <Field label="Full name" error={issueFor(ed.issues, 'name')}>
                  {(id) => <TextInput id={id} value={d.name} onChange={(v) => ed.edit((x) => void (x.name = v))} />}
                </Field>
                <Field label="Initials" hint="Used where space is tight.">
                  {(id) => (
                    <TextInput id={id} value={d.shortName} onChange={(v) => ed.edit((x) => void (x.shortName = v))} />
                  )}
                </Field>
                <Field label="Role" error={issueFor(ed.issues, 'role')}>
                  {(id) => <TextInput id={id} value={d.role} onChange={(v) => ed.edit((x) => void (x.role = v))} />}
                </Field>
                <Field label="Copyright year">
                  {(id) => <NumberInput id={id} value={d.year} onChange={(v) => ed.edit((x) => void (x.year = v))} />}
                </Field>
              </Grid>
              <Field label="Disciplines" hint="One per line — shown under your name (e.g. AI, LLMs, Machine Learning).">
                {(id) => (
                  <LinesInput
                    id={id}
                    rows={3}
                    value={d.disciplines}
                    onChange={(v) => ed.edit((x) => void (x.disciplines = v))}
                  />
                )}
              </Field>
            </Panel>

            <Panel title="Hero">
              <Grid>
                <Field label="Statement" hint="Sentence before the italic word.">
                  {(id) => (
                    <TextInput
                      id={id}
                      value={d.statement.lead}
                      onChange={(v) => ed.edit((x) => void (x.statement.lead = v))}
                    />
                  )}
                </Field>
                <Field label="Italic ending" hint="e.g. “decisions.”">
                  {(id) => (
                    <TextInput
                      id={id}
                      value={d.statement.emphasis}
                      onChange={(v) => ed.edit((x) => void (x.statement.emphasis = v))}
                    />
                  )}
                </Field>
              </Grid>
              <Field label="Intro paragraph">
                {(id) => (
                  <TextArea id={id} rows={3} value={d.intro} onChange={(v) => ed.edit((x) => void (x.intro = v))} />
                )}
              </Field>
            </Panel>

            <Panel title="Contact">
              <Grid>
                <Field label="Email" error={issueFor(ed.issues, 'email')} {...placeholderProps(d, 'email', confirm)}>
                  {(id) => (
                    <TextInput
                      id={id}
                      type="email"
                      value={d.email}
                      onChange={(v) => ed.edit((x) => void (x.email = v), 'email')}
                    />
                  )}
                </Field>
                <Field label="Based in" {...placeholderProps(d, 'location', confirm)}>
                  {(id) => (
                    <TextInput
                      id={id}
                      value={d.location}
                      onChange={(v) => ed.edit((x) => void (x.location = v), 'location')}
                    />
                  )}
                </Field>
              </Grid>
              <Field
                label="Social links"
                hint="Full URLs, e.g. https://github.com/your-name"
                {...placeholderProps(d, 'socials', confirm)}
              >
                {() => (
                  <Rows
                    items={d.socials}
                    onChange={(v) => ed.edit((x) => void (x.socials = v), 'socials')}
                    create={() => ({ label: '', href: 'https://' })}
                    itemLabel={(s) => s.label}
                    addLabel="Add link"
                    render={(s, update, i) => (
                      <Grid>
                        <Field label="Label" error={issueFor(ed.issues, `socials.${i}.label`)}>
                          {(id) => (
                            <TextInput id={id} value={s.label} onChange={(v) => update((y) => void (y.label = v))} />
                          )}
                        </Field>
                        <Field label="URL" error={issueFor(ed.issues, `socials.${i}.href`)}>
                          {(id) => (
                            <TextInput
                              id={id}
                              type="url"
                              value={s.href}
                              onChange={(v) => update((y) => void (y.href = v))}
                            />
                          )}
                        </Field>
                      </Grid>
                    )}
                  />
                )}
              </Field>
            </Panel>

            <Panel
              title="CV and availability"
              description="What recruiters look for first. The status line appears in the hero and the contact section."
            >
              <Toggle
                label="Show “Open to work”"
                checked={d.openToWork ?? true}
                onChange={(v) => ed.edit((x) => void (x.openToWork = v))}
              />
              <Field
                label="Availability"
                hint="e.g. Open to Data Science, ML & AI Engineering roles"
                {...placeholderProps(d, 'availability', confirm)}
              >
                {(id) => (
                  <TextInput
                    id={id}
                    value={d.availability}
                    onChange={(v) => ed.edit((x) => void (x.availability = v), 'availability')}
                  />
                )}
              </Field>
              <Field label="Availability details" hint="Optional, e.g. Remote or hybrid · can start in November">
                {(id) => (
                  <TextInput
                    id={id}
                    value={d.availabilityNote ?? ''}
                    onChange={(v) => ed.edit((x) => void (x.availabilityNote = v))}
                  />
                )}
              </Field>
              <CvField
                ownerName={d.name}
                value={d.cvUrl ?? ''}
                onChange={(url) => ed.edit((x) => void (x.cvUrl = url))}
              />
              {issueFor(ed.issues, 'cvUrl') && (
                <p className="text-[0.8rem] text-[#8f1d17]" role="alert">
                  {issueFor(ed.issues, 'cvUrl')}
                </p>
              )}
            </Panel>

            <Panel title="About section">
              <Field label="Heading">
                {(id) => (
                  <TextArea
                    id={id}
                    rows={2}
                    value={d.about.heading}
                    onChange={(v) => ed.edit((x) => void (x.about.heading = v))}
                  />
                )}
              </Field>
              <Field label="Paragraphs">
                {() => (
                  <Rows
                    items={d.about.paragraphs}
                    onChange={(v) => ed.edit((x) => void (x.about.paragraphs = v))}
                    create={() => ''}
                    itemLabel={(p) => p.slice(0, 60)}
                    addLabel="Add paragraph"
                    render={(p, _update, i) => (
                      <Field label="Text">
                        {(id) => (
                          <TextArea
                            id={id}
                            rows={4}
                            value={p}
                            onChange={(v) => ed.edit((x) => void (x.about.paragraphs[i] = v))}
                          />
                        )}
                      </Field>
                    )}
                  />
                )}
              </Field>
              <Field label="Facts" {...placeholderProps(d, 'about.facts', confirm)}>
                {() => (
                  <Rows
                    items={d.about.facts}
                    onChange={(v) => ed.edit((x) => void (x.about.facts = v), 'about.facts')}
                    create={() => ({ label: '', value: '' })}
                    itemLabel={(f) => f.label}
                    addLabel="Add fact"
                    render={(f, update) => (
                      <Grid>
                        <Field label="Label">
                          {(id) => (
                            <TextInput id={id} value={f.label} onChange={(v) => update((y) => void (y.label = v))} />
                          )}
                        </Field>
                        <Field label="Value">
                          {(id) => (
                            <TextInput id={id} value={f.value} onChange={(v) => update((y) => void (y.value = v))} />
                          )}
                        </Field>
                      </Grid>
                    )}
                  />
                )}
              </Field>
              <Field label="Path stages" hint="The vertical path, oldest first.">
                {() => (
                  <Rows
                    items={d.about.stages}
                    onChange={(v) => ed.edit((x) => void (x.about.stages = v))}
                    create={() => ({ label: '', note: '' })}
                    itemLabel={(s) => s.label}
                    addLabel="Add stage"
                    render={(s, update) => (
                      <Grid>
                        <Field label="Stage">
                          {(id) => (
                            <TextInput id={id} value={s.label} onChange={(v) => update((y) => void (y.label = v))} />
                          )}
                        </Field>
                        <Field label="Note">
                          {(id) => (
                            <TextInput id={id} value={s.note} onChange={(v) => update((y) => void (y.note = v))} />
                          )}
                        </Field>
                      </Grid>
                    )}
                  />
                )}
              </Field>
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
