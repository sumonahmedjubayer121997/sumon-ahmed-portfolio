import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { collections, type Milestone, type Project, type Research, type Site, type SkillGroup } from '@/content/schema';
import { hasContent, importStarterContent, loadCollection, loadDoc } from './data';
import { firebaseEnv } from './firebase';
import { Badge, Button, Panel } from './ui';
import { PageHeader } from './editors/common';

interface Todo {
  where: string;
  fields: string[];
  to: string;
}

async function collectTodos(): Promise<Todo[]> {
  const [site, research, projects, experience, skills] = await Promise.all([
    loadDoc<Site>(collections.site.path, collections.site.id),
    loadDoc<Research>(collections.research.path, collections.research.id),
    loadCollection<Project>(collections.projects),
    loadCollection<Milestone>(collections.experience),
    loadCollection<SkillGroup>(collections.skills),
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
  return todos;
}

export default function Overview() {
  const [state, setState] = useState<'loading' | 'empty' | 'ready' | 'error'>('loading');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      if (!(await hasContent())) return setState('empty');
      setTodos(await collectTodos());
      setState('ready');
    } catch (e) {
      setError((e as Error).message);
      setState('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runImport = async () => {
    setImporting(true);
    try {
      await importStarterContent();
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
              <Button variant="primary" onClick={runImport} disabled={importing}>
                {importing ? 'Importing…' : 'Import starter content'}
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

        <Panel
          title="Publishing"
          description={
            <>
              The public site is static: content is pulled from Firestore when the site is built, so visitors never wait
              on the database. A one-click Publish button (which triggers the build and deploy) arrives with the CI
              pipeline. Until then, run <code className="font-mono text-[0.85em]">npm run build</code> to rebuild with
              the latest content.
            </>
          }
        >
          <p className="t-label text-[10px] text-muted">
            Project · {firebaseEnv?.projectId}
            {firebaseEnv?.useEmulators && ' · local emulator'}
          </p>
        </Panel>
      </div>
    </>
  );
}
