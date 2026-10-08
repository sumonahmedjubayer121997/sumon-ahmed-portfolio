import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  collections,
  type Milestone,
  type Post,
  type Project,
  type Research,
  type Site,
  type SkillGroup,
} from '@/content/schema';
import {
  applyStarterUpdates,
  contentParts,
  emptyParts,
  importStarterContent,
  loadCollection,
  loadDoc,
  partLabels,
  starterUpdates,
  type ContentPart,
  type StarterUpdate,
} from './data';
import { PublishPanel } from './PublishPanel';
import { Badge, Button, Panel } from './ui';
import { PageHeader } from './editors/common';

interface Todo {
  where: string;
  fields: string[];
  to: string;
}

async function collectTodos(): Promise<Todo[]> {
  const [site, research, projects, experience, skills, posts] = await Promise.all([
    loadDoc<Site>(collections.site.path, collections.site.id),
    loadDoc<Research>(collections.research.path, collections.research.id),
    loadCollection<Project>(collections.projects),
    loadCollection<Milestone>(collections.experience),
    loadCollection<SkillGroup>(collections.skills),
    loadCollection<Post>(collections.posts),
  ]);
  const todos: Todo[] = [];
  const add = (where: string, fields: string[] | undefined, to: string) => {
    if (fields?.length) todos.push({ where, fields, to });
  };
  add('Profile', site?.placeholders, '/admin/profile');
  add('Research', research?.placeholders, '/admin/research');
  projects.forEach((p) => add(`${p.index} ${p.title}`, p.placeholders, `/admin/projects/${p.slug}`));
  experience.forEach((m) => add(`Experience · ${m.year}`, m.placeholders, '/admin/experience'));
  skills.forEach((g) => add(`Skills · ${g.label}`, g.placeholders, '/admin/skills'));
  posts.forEach((p) => add(`Blog · ${p.title}`, p.placeholders, `/admin/posts/${p.slug}`));
  return todos;
}

export default function Overview() {
  const [state, setState] = useState<'loading' | 'empty' | 'ready' | 'error'>('loading');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [missing, setMissing] = useState<ContentPart[]>([]);
  const [updates, setUpdates] = useState<StarterUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const empty = await emptyParts();
      setMissing(empty);
      if (empty.length === contentParts.length) return setState('empty');
      const [t, u] = await Promise.all([collectTodos(), starterUpdates()]);
      setTodos(t);
      setUpdates(u);
      setState('ready');
    } catch (e) {
      setError((e as Error).message);
      setState('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runImport = async (parts: ContentPart[]) => {
    setImporting(true);
    try {
      await importStarterContent(parts);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Content studio"
        description="Edit what the portfolio shows. Changes are saved to Firestore; the public site picks them up on the next build."
      />
      <div className="grid gap-6">
        {state !== 'empty' && <PublishPanel />}
        {state === 'loading' && <p className="t-label text-muted">Loading…</p>}
        {state === 'error' && (
          <p className="text-[#8f1d17]" role="alert">
            {error}
          </p>
        )}

        {state === 'empty' && (
          <Panel
            title="Start with the current content"
            description="Firestore is empty. Import the content the site already shows; invented values are flagged as placeholders so you can replace them one by one."
          >
            <div>
              <Button variant="primary" onClick={() => void runImport(missing)} disabled={importing}>
                {importing ? 'Importing…' : 'Import starter content'}
              </Button>
            </div>
          </Panel>
        )}

        {state === 'ready' && updates.length > 0 && (
          <StarterUpdates
            updates={updates}
            onDone={() => {
              setUpdates([]);
              void refresh();
            }}
          />
        )}

        {state === 'ready' && missing.length > 0 && (
          <Panel
            title="Empty sections"
            description={`${missing.map((m) => partLabels[m]).join(', ')} ${missing.length > 1 ? 'have' : 'has'} no content in Firestore yet, so the site shows nothing there. Import the starter version to edit from.`}
          >
            <div>
              <Button onClick={() => void runImport(missing)} disabled={importing}>
                {importing ? 'Importing…' : `Import ${missing.map((m) => partLabels[m].toLowerCase()).join(', ')}`}
              </Button>
            </div>
          </Panel>
        )}

        {state === 'ready' && (
          <Panel
            title="Replace placeholder content"
            description="These fields still hold invented or unconfirmed values. Editing a field — or choosing “Mark as real” — clears it."
            actions={
              todos.length ? (
                <Badge tone="warn">{todos.reduce((n, t) => n + t.fields.length, 0)} fields left</Badge>
              ) : (
                <Badge tone="ok">All real</Badge>
              )
            }
          >
            {todos.length === 0 ? (
              <p className="text-[0.95rem] text-ink-2">Every field is confirmed. 🎯</p>
            ) : (
              <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {todos.map((t) => (
                  <li key={t.where}>
                    <Link
                      to={t.to}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 hover:bg-paper/50"
                    >
                      <span className="text-[0.95rem]">{t.where}</span>
                      <span className="font-mono text-[0.8rem] text-muted">{t.fields.join(' · ')} →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}

function StarterUpdates({ updates, onDone }: { updates: StarterUpdate[]; onDone: () => void }) {
  // Documents you've saved since importing start unticked, so your edits are never replaced by accident.
  const [picked, setPicked] = useState(() => new Set(updates.filter((u) => !u.editedAt).map((u) => u.label)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = updates.filter((u) => picked.has(u.label));

  const run = async (chosen: StarterUpdate[]) => {
    const edited = chosen.filter((u) => u.editedAt);
    if (
      edited.length &&
      !window.confirm(
        `${edited.map((u) => u.label).join(', ')} ${edited.length > 1 ? 'were' : 'was'} edited after the import. Replace with the starter version anyway?`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await applyStarterUpdates(chosen);
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Starter content updates"
      description="The starter content has improved since it was imported — real contact links, the Netflix project write-up, new skills, honest outcomes. Updating replaces each ticked document with its latest starter version."
      actions={<Badge tone="warn">{updates.length} documents</Badge>}
    >
      <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {updates.map((u) => (
          <li key={u.label}>
            <label className="flex cursor-pointer items-start gap-3 py-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={picked.has(u.label)}
                onChange={(e) =>
                  setPicked((p) => {
                    const next = new Set(p);
                    if (e.target.checked) next.add(u.label);
                    else next.delete(u.label);
                    return next;
                  })
                }
              />
              <span className="grid gap-1">
                <span className="flex flex-wrap items-center gap-2 text-[0.95rem]">
                  {u.label}
                  {u.editedAt && <Badge>Edited {u.editedAt.toLocaleString()}</Badge>}
                </span>
                <span className="font-mono text-[0.78rem] text-muted">{u.changed.join(' · ')}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {error && (
        <p className="text-[0.9rem] text-[#8f1d17]" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => void run(selected)} disabled={busy || !selected.length}>
          {busy ? 'Updating…' : `Update ${selected.length} selected`}
        </Button>
        <Button variant="ghost" onClick={() => void run([])} disabled={busy}>
          Keep my content
        </Button>
      </div>
    </Panel>
  );
}
