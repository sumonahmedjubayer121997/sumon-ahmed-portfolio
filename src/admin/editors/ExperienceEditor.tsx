import { collections, milestoneSchema, type Milestone } from '@/content/schema';
import { slugify, useCollectionEditor } from '../useEditors';
import { Badge, Button, Field, Grid, LinesInput, Panel, Rows, SaveBar, TextArea, TextInput, Toggle } from '../ui';
import { EditorState, PageHeader } from './common';

const idOf = (m: Milestone) => m.id;

export default function ExperienceEditor() {
  const ed = useCollectionEditor<Milestone>(collections.experience, milestoneSchema, idOf);
  const items = ed.draft?.items ?? [];

  const setItems = (next: Milestone[]) => ed.edit((x) => void (x.items = next));
  /** Editing a field of an entry clears that field's placeholder flag. */
  const change = (i: number, key: keyof Milestone, apply: (m: Milestone) => void) =>
    ed.edit((x) => {
      apply(x.items[i]);
      x.items[i].placeholders = x.items[i].placeholders.filter((k) => k !== key);
    });

  return (
    <>
      <PageHeader
        title="Experience"
        description="The timeline on the homepage, oldest first. Reorder with the arrows."
      />
      <EditorState state={ed.state} error={ed.error}>
        <div className="grid gap-6">
          <Panel title="Milestones">
            <Rows
              items={items}
              onChange={setItems}
              itemLabel={(m) => `${m.year} — ${m.title}`}
              addLabel="Add milestone"
              create={() => ({
                id: `exp-${Date.now().toString(36)}`,
                year: String(new Date().getFullYear()),
                title: '',
                context: '',
                body: '',
                tags: [],
                order: items.length,
                published: true,
                placeholders: [],
              })}
              render={(m, _u, i) => (
                <>
                  {m.placeholders.length > 0 && (
                    <div className="flex items-center gap-3">
                      <Badge tone="warn">Placeholder: {m.placeholders.join(', ')}</Badge>
                      <Button variant="ghost" onClick={() => ed.edit((x) => void (x.items[i].placeholders = []))}>
                        Mark as real
                      </Button>
                    </div>
                  )}
                  <Grid cols={3}>
                    <Field label="Year">
                      {(id) => (
                        <TextInput
                          id={id}
                          value={m.year}
                          onChange={(v) => change(i, 'year', (y) => void (y.year = v))}
                        />
                      )}
                    </Field>
                    <Field label="Title">
                      {(id) => (
                        <TextInput
                          id={id}
                          value={m.title}
                          onChange={(v) => change(i, 'title', (y) => void (y.title = v))}
                        />
                      )}
                    </Field>
                    <Field label="Context" hint="Organisation or setting.">
                      {(id) => (
                        <TextInput
                          id={id}
                          value={m.context}
                          onChange={(v) => change(i, 'context', (y) => void (y.context = v))}
                        />
                      )}
                    </Field>
                  </Grid>
                  <Field label="Description">
                    {(id) => (
                      <TextArea
                        id={id}
                        rows={3}
                        value={m.body}
                        onChange={(v) => change(i, 'body', (y) => void (y.body = v))}
                      />
                    )}
                  </Field>
                  <Grid>
                    <Field label="Tags" hint="One per line.">
                      {(id) => (
                        <LinesInput
                          id={id}
                          rows={3}
                          value={m.tags}
                          onChange={(v) => change(i, 'tags', (y) => void (y.tags = v))}
                        />
                      )}
                    </Field>
                    <Field label="Document id" hint="Stable identifier — change only for new entries.">
                      {(id) => (
                        <TextInput
                          id={id}
                          value={m.id}
                          onChange={(v) => ed.edit((x) => void (x.items[i].id = slugify(v) || x.items[i].id))}
                        />
                      )}
                    </Field>
                  </Grid>
                  <Toggle
                    label="Published"
                    checked={m.published}
                    onChange={(v) => ed.edit((x) => void (x.items[i].published = v))}
                  />
                </>
              )}
            />
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
      </EditorState>
    </>
  );
}
