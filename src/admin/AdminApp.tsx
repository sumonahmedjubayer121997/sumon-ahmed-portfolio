import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router';
import type { User } from 'firebase/auth';
import { cn } from '@/lib/cn';
import { firebaseEnv } from './firebase';
import { useAdminAuth } from './useAdminAuth';
import { Badge, Button } from './ui';
import Overview from './Overview';
import ProfileEditor from './editors/ProfileEditor';
import ProjectsList from './editors/ProjectsList';
import ProjectEditor from './editors/ProjectEditor';
import ExperienceEditor from './editors/ExperienceEditor';
import SkillsEditor from './editors/SkillsEditor';
import ResearchEditor from './editors/ResearchEditor';

/**
 * Private content studio at /admin. Lazy-loaded, so the Firebase SDK never ships
 * to visitors; never indexed.
 */
export default function AdminApp() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    const prevTitle = document.title;
    document.title = 'Content studio — Sumon Ahmed';
    return () => {
      meta.remove();
      document.title = prevTitle;
    };
  }, []);

  return <div className="min-h-[100svh] bg-paper/60 text-ink">{firebaseEnv ? <Gate /> : <SetupNotice />}</div>;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[100svh] max-w-md flex-col justify-center gap-6 px-6">
      <p className="t-label text-muted">Content studio</p>
      {children}
    </main>
  );
}

function SetupNotice() {
  return (
    <Centered>
      <h1 className="text-[2rem] font-medium leading-tight tracking-[-0.03em]">Connect Firebase first</h1>
      <p className="leading-relaxed text-ink-2">
        Add your Firebase web app config to <code className="font-mono text-[0.9em]">.env.local</code> (see{' '}
        <code className="font-mono text-[0.9em]">.env.example</code>), or run the local emulators with{' '}
        <code className="font-mono text-[0.9em]">npm run emulators</code> and{' '}
        <code className="font-mono text-[0.9em]">npm run dev:emu</code>.
      </p>
    </Centered>
  );
}

function Gate() {
  const { state, error, signIn, signInTestAccount, signOut, recheck } = useAdminAuth();

  if (state.status === 'loading') {
    return (
      <Centered>
        <p className="t-label text-muted">Checking your session…</p>
      </Centered>
    );
  }

  if (state.status === 'signed-out') {
    return (
      <Centered>
        <h1 className="text-[2rem] font-medium leading-tight tracking-[-0.03em]">Sign in to edit your portfolio</h1>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={signIn}>
            Sign in with Google
          </Button>
          {firebaseEnv?.useEmulators && <Button onClick={signInTestAccount}>Local test account</Button>}
        </div>
        {error && (
          <p className="text-[0.9rem] text-[#8f1d17]" role="alert">
            {error}
          </p>
        )}
      </Centered>
    );
  }

  if (state.status === 'not-admin') return <NotAdmin user={state.user} onRecheck={recheck} onSignOut={signOut} />;

  return <Studio user={state.user} onSignOut={signOut} />;
}

function NotAdmin({ user, onRecheck, onSignOut }: { user: User; onRecheck: () => void; onSignOut: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Centered>
      <h1 className="text-[2rem] font-medium leading-tight tracking-[-0.03em]">
        One-time setup: make yourself an admin
      </h1>
      <ol className="list-decimal space-y-2 pl-5 leading-relaxed text-ink-2">
        <li>
          Open the Firebase console → Firestore → <strong>Start collection</strong> named{' '}
          <code className="font-mono text-[0.9em]">admins</code>.
        </li>
        <li>
          Use your user ID as the document ID (no fields needed):
          <span className="mt-2 flex items-center gap-2">
            <code className="break-all rounded-[3px] bg-ink/[0.06] px-2 py-1 font-mono text-[0.85em]">{user.uid}</code>
            <Button
              variant="ghost"
              onClick={() => void navigator.clipboard.writeText(user.uid).then(() => setCopied(true))}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </span>
        </li>
        <li>Come back and check again.</li>
      </ol>
      <p className="text-[0.85rem] text-muted">Signed in as {user.email}.</p>
      <div className="flex gap-3">
        <Button variant="primary" onClick={onRecheck}>
          Check again
        </Button>
        <Button variant="ghost" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </Centered>
  );
}

const NAV = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/profile', label: 'Profile' },
  { to: '/admin/projects', label: 'Projects' },
  { to: '/admin/experience', label: 'Experience' },
  { to: '/admin/skills', label: 'Skills' },
  { to: '/admin/research', label: 'Research' },
];

function Studio({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  return (
    <div className="grid min-h-[100svh] md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="border-b border-[var(--line)] bg-ivory md:sticky md:top-0 md:h-[100svh] md:border-b-0 md:border-r">
        <div className="flex h-full flex-col gap-6 p-5">
          <div>
            <p className="t-label text-ink">Sumon Ahmed</p>
            <p className="t-label mt-1 text-[10px] text-muted">Content studio</p>
            {firebaseEnv?.useEmulators && (
              <div className="mt-3">
                <Badge tone="warn">Local emulator</Badge>
              </div>
            )}
          </div>
          <nav aria-label="Content" className="flex gap-1 overflow-x-auto md:flex-col">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    'whitespace-nowrap rounded-[3px] px-3 py-2 text-[0.95rem] transition-colors',
                    isActive ? 'bg-ink text-ivory' : 'text-ink-2 hover:bg-ink/[0.05]',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto hidden gap-2 md:grid">
            <a href="/" target="_blank" rel="noreferrer" className="t-label text-[10px] text-muted hover:text-ink">
              View site ↗
            </a>
            <p className="truncate text-[0.8rem] text-muted" title={user.email ?? ''}>
              {user.email}
            </p>
            <div>
              <Button variant="ghost" onClick={onSignOut} className="px-0">
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-5 py-8 sm:px-8 md:py-10">
        <div className="mx-auto max-w-4xl">
          <Routes>
            <Route path="/admin" element={<Overview />} />
            <Route path="/admin/profile" element={<ProfileEditor />} />
            <Route path="/admin/projects" element={<ProjectsList />} />
            <Route path="/admin/projects/:slug" element={<ProjectEditor />} />
            <Route path="/admin/experience" element={<ExperienceEditor />} />
            <Route path="/admin/skills" element={<SkillsEditor />} />
            <Route path="/admin/research" element={<ResearchEditor />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
