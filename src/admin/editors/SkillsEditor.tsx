import { collections, skillGroupSchema, type SkillGroup } from '@/content/schema';
import { slugify, useCollectionEditor } from '../useEditors';
import { Field, Grid, LinesInput, NumberInput, Panel, Rows, SaveBar, TextInput, Toggle } from '../ui';
import { EditorState, PageHeader } from './common';

const idOf = (g: SkillGroup) => g.id;

export default function SkillsEditor() {
  const ed = useCollectionEditor<SkillGroup>(collections.skills, skillGroupSchema, idOf);
  const items = ed.draft?.items ?? [];

  return (
    <>
      <PageHeader
        title="Skills"
        description="Groups in the technology ecosystem. Centre positions are fractions of the stage (0–1) on desktop."
      />
      <EditorState state={ed.state} error={ed.error}>
        <div className="grid gap-6">
          <Panel title="Groups">
            <Rows
              items={items}
              onChange={(next) => ed.edit((x) => void (x.items = next))}
              itemLabel={(g) => g.label}
              addLabel="Add group"
              create={() => ({
                id: `group-${Date.now().toString(36)}`,
                label: '',
                note: '',
                center: { x: 0.5, y: 0.5 },
                items: [],
                order: items.length,
                published: true,
                placeholders: [],
              })}
              render={(g, update) => (
                <>
                  <Grid>
                    <Field label="Group name">
                      {(id) => (
                        <TextInput
                          id={id}
                          value={g.label}
                          onChange={(v) =>
                            update((y) => {
                              y.label = v;
                              if (y.id.startsWith('group-')) y.id = slugify(v) || y.id;
                            })
                          }
                        />
                      )}
                    </Field>
                    <Field label="One-line note">
                      {(id) => <TextInput id={id} value={g.note} onChange={(v) => update((y) => void (y.note = v))} />}
                    </Field>
                  </Grid>
                  <Field label="Technologies" hint="One per line.">
                    {(id) => (
                      <LinesInput
                        id={id}
                        rows={6}
                        value={g.items}
                        onChange={(v) => update((y) => void (y.items = v))}
                      />
                    )}
                  </Field>
                  <Grid cols={3}>
                    <Field label="Centre x">
                      {(id) => (
                        <NumberInput
                          id={id}
                          step={0.01}
                          min={0}
                          max={1}
                          value={g.center.x}
                          onChange={(v) => update((y) => void (y.center.x = v))}
                        />
                      )}
                    </Field>
                    <Field label="Centre y">
                      {(id) => (
                        <NumberInput
                          id={id}
                          step={0.01}
                          min={0}
                          max={1}
                          value={g.center.y}
                          onChange={(v) => update((y) => void (y.center.y = v))}
                        />
                      )}
                    </Field>
                    <div className="self-end pb-2">
                      <Toggle
                        label="Published"
                        checked={g.published}
                        onChange={(v) => update((y) => void (y.published = v))}
                      />
                    </div>
                  </Grid>
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
