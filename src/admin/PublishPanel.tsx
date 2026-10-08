import { useCallback, useEffect, useState } from 'react';
import { firebaseEnv } from './firebase';
import {
  DEFAULT_REPO,
  loadPublishSettings,
  recentRuns,
  savePublishSettings,
  startPublish,
  testConnection,
  type PublishRun,
  type PublishSettings,
} from './publish';
import { Badge, Button, Field, Grid, Panel, TextInput } from './ui';

const ago = (d: Date) => {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const running = (r: PublishRun) => r.status !== 'completed';
const TRIGGER: Record<string, string> = {
  workflow_dispatch: 'Publish button',
  push: 'Code change',
  schedule: 'Daily rebuild',
};

/** `live`: this is the newest successful run, i.e. the version visitors see. */
function RunStatus({ run, live }: { run: PublishRun; live: boolean }) {
  if (running(run)) return <Badge tone="warn">{run.status === 'queued' ? 'Queued' : 'Publishing…'}</Badge>;
  if (run.conclusion === 'success') return live ? <Badge tone="ok">Live</Badge> : <Badge>Published</Badge>;
  if (run.conclusion === 'cancelled' || run.conclusion === 'skipped') return <Badge>Cancelled</Badge>;
  return <Badge tone="warn">Failed</Badge>;
}

/**
 * Overview → Publishing. Starts the deploy workflow and follows its progress;
 * first-time setup asks for a GitHub token (stored admin-only in Firestore).
 */
export function PublishPanel() {
  const [settings, setSettings] = useState<PublishSettings | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [runs, setRuns] = useState<PublishRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** When Publish was pressed, until GitHub lists the run it started. */
  const [pendingSince, setPendingSince] = useState<number | null>(null);

  useEffect(() => {
    loadPublishSettings().then(setSettings, (e: Error) => setError(e.message));
  }, []);

  const refresh = useCallback(async (s: PublishSettings) => {
    try {
      setRuns(await recentRuns(s));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (settings) void refresh(settings);
  }, [settings, refresh]);

  const latest = runs?.[0];
  const lastLive = runs?.find((r) => r.conclusion === 'success');
  // The run started by Publish has appeared (GitHub lists it a few seconds later).
  const started = pendingSince !== null && !!latest && latest.createdAt.getTime() >= pendingSince - 10_000;
  useEffect(() => {
    if (started) setPendingSince(null);
  }, [started]);

  // Follow a publish while it runs, and while waiting for its run to appear.
  const active = !!runs?.some(running) || pendingSince !== null;
  useEffect(() => {
    if (!settings || !active) return;
    const id = window.setInterval(() => void refresh(settings), 6000);
    return () => window.clearInterval(id);
  }, [settings, active, refresh]);

  const publish = async () => {
    if (!settings) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await startPublish(settings, 'Published from /admin');
      setPendingSince(Date.now());
      window.setTimeout(() => void refresh(settings), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const status =
    pendingSince !== null
      ? 'Publishing started — waiting for GitHub to pick it up.'
      : latest && running(latest)
        ? `${latest.status === 'queued' ? 'Waiting to start' : 'Building and deploying'} — started ${ago(latest.createdAt)}. The site updates in about two minutes.`
        : latest && latest.conclusion !== 'success' && latest.conclusion !== 'cancelled'
          ? 'The last publish failed — open its details on GitHub to see why. The site still shows the previous version.'
          : lastLive
            ? `Last published ${ago(lastLive.updatedAt)}.`
            : (message ?? 'Not published from here yet.');

  return (
    <Panel
      title="Publishing"
      description="The public site is static and fast: Publish rebuilds it from Firestore and deploys it, in about two minutes. Drafts stay hidden; a daily rebuild also brings scheduled posts online."
      actions={
        settings ? (
          <Button
            variant="primary"
            onClick={() => void publish()}
            disabled={busy || pendingSince !== null || (!!latest && running(latest))}
          >
            {busy ? 'Starting…' : 'Publish now'}
          </Button>
        ) : undefined
      }
    >
      {settings === undefined && !error && <p className="t-label text-muted">Loading…</p>}

      {settings && !editing && (
        <div className="grid gap-4">
          <p className="text-[0.95rem] text-ink-2" aria-live="polite">
            {status}{' '}
            <a href="https://sumonahmed.web.app/" target="_blank" rel="noreferrer" className="underline">
              View site ↗
            </a>
          </p>
          {runs && runs.length > 0 && (
            <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {runs.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                  <span className="flex items-center gap-3 text-[0.9rem]">
                    <RunStatus run={r} live={r === lastLive} />
                    <span>{TRIGGER[r.event] ?? r.event}</span>
                    <span className="text-muted">{ago(r.createdAt)}</span>
                  </span>
                  <a href={r.url} target="_blank" rel="noreferrer" className="t-label text-[10px] text-muted underline">
                    Details on GitHub ↗
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div>
            <Button variant="ghost" onClick={() => setEditing(true)} className="px-0">
              Change GitHub token
            </Button>
          </div>
        </div>
      )}

      {(settings === null || editing) && (
        <SetupForm
          initial={settings ?? null}
          onSaved={(s) => {
            setSettings(s);
            setEditing(false);
            setMessage('Connected to GitHub. Press “Publish now” whenever you want your edits live.');
          }}
          onCancel={settings ? () => setEditing(false) : undefined}
        />
      )}

      {error && (
        <p className="text-[0.9rem] text-[#8f1d17]" role="alert">
          {error}
        </p>
      )}
      <p className="t-label text-[10px] text-muted">
        Project · {firebaseEnv?.projectId}
        {firebaseEnv?.useEmulators && ' · local emulator'}
      </p>
    </Panel>
  );
}

function SetupForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: PublishSettings | null;
  onSaved: (s: PublishSettings) => void;
  onCancel?: () => void;
}) {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState(initial?.repo ?? DEFAULT_REPO);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const s = { token: token.trim(), repo: repo.trim(), branch: initial?.branch ?? 'main' };
    if (!s.token) return setError('Paste the token first.');
    setBusy(true);
    setError(null);
    try {
      await testConnection(s);
      await savePublishSettings(s);
      onSaved(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      {!initial && (
        <ol className="list-decimal space-y-2 pl-5 text-[0.92rem] leading-relaxed text-ink-2">
          <li>
            Once, in a terminal in the project folder, run{' '}
            <code className="font-mono text-[0.85em]">npx firebase init hosting:github</code>. It signs you in to GitHub
            and stores a deploy key in the repository. Choose this repository; answer <em>No</em> to both workflow
            questions — the project has its own.
          </li>
          <li>
            Create a{' '}
            <a
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              fine-grained GitHub token
            </a>
            : repository access <em>Only select repositories</em> → this repository; permission{' '}
            <em>Actions: Read and write</em>.
          </li>
          <li>Paste it below. It is stored where only admins can read it, and is never part of the public site.</li>
        </ol>
      )}
      <Grid>
        <Field label="GitHub token" hint="Starts with github_pat_">
          {(id) => (
            <input
              id={id}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-[3px] border border-[var(--line-strong)] bg-white/60 px-3 py-2 font-mono text-[0.85rem] text-ink outline-none transition-colors focus:border-ink"
            />
          )}
        </Field>
        <Field label="Repository" hint="owner/name">
          {(id) => <TextInput id={id} value={repo} onChange={setRepo} />}
        </Field>
      </Grid>
      {error && (
        <p className="text-[0.9rem] text-[#8f1d17]" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button variant="primary" onClick={() => void save()} disabled={busy}>
          {busy ? 'Checking…' : 'Save and connect'}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
