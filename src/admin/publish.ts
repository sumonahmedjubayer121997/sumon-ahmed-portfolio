/**
 * One-click Publish: starts the "Publish site" GitHub Actions workflow
 * (.github/workflows/deploy.yml) and reads its runs, with a fine-grained GitHub
 * token stored in site/publish — an unpublished document only admins can read
 * (firestore.rules). The token never reaches the public site.
 */
import { loadDoc, saveDoc } from './data';
import { collections } from '@/content/schema';

export const DEFAULT_REPO = 'sumonahmedjubayer121997/sumon-ahmed-portfolio';
export const WORKFLOW = 'deploy.yml';

export interface PublishSettings {
  token: string;
  repo: string;
  branch: string;
}

const SETTINGS = { path: collections.site.path, id: 'publish' };

export async function loadPublishSettings(): Promise<PublishSettings | null> {
  const doc = await loadDoc<Partial<PublishSettings>>(SETTINGS.path, SETTINGS.id);
  if (!doc?.token) return null;
  return { token: doc.token, repo: doc.repo || DEFAULT_REPO, branch: doc.branch || 'main' };
}

export async function savePublishSettings(s: PublishSettings) {
  // published:false keeps it out of public reads and out of the build.
  await saveDoc(SETTINGS.path, SETTINGS.id, { ...s, published: false });
}

export class GitHubError extends Error {}

async function github(s: PublishSettings, path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${s.repo}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${s.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new GitHubError('Couldn’t reach GitHub. Check your connection and try again.');
  }
  if (res.ok) return res;
  const reasons: Record<number, string> = {
    401: 'GitHub rejected the token — it may have expired. Paste a new one below.',
    403: 'The token can’t run workflows. Give it “Actions: Read and write” on this repository.',
    404: `GitHub can’t find ${s.repo} or its “Publish site” workflow. Check the repository name, and that the workflow is on ${s.branch}.`,
    422: 'GitHub refused to start the workflow. Is it the version with “workflow_dispatch” on the branch?',
  };
  throw new GitHubError(reasons[res.status] ?? `GitHub answered ${res.status} ${res.statusText}.`);
}

export interface PublishRun {
  id: number;
  title: string;
  event: string;
  status: 'queued' | 'in_progress' | 'completed' | string;
  conclusion: 'success' | 'failure' | 'cancelled' | string | null;
  createdAt: Date;
  updatedAt: Date;
  url: string;
}

export async function recentRuns(s: PublishSettings, count = 5): Promise<PublishRun[]> {
  const res = await github(s, `/actions/workflows/${WORKFLOW}/runs?per_page=${count}`);
  const body = (await res.json()) as {
    workflow_runs: Array<{
      id: number;
      display_title: string;
      event: string;
      status: string;
      conclusion: string | null;
      created_at: string;
      updated_at: string;
      html_url: string;
    }>;
  };
  return body.workflow_runs.map((r) => ({
    id: r.id,
    title: r.display_title,
    event: r.event,
    status: r.status,
    conclusion: r.conclusion,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
    url: r.html_url,
  }));
}

/** Checks the token can see the workflow (without starting it). */
export async function testConnection(s: PublishSettings) {
  await github(s, `/actions/workflows/${WORKFLOW}`);
}

export async function startPublish(s: PublishSettings, reason: string) {
  await github(s, `/actions/workflows/${WORKFLOW}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: s.branch, inputs: { reason } }),
  });
}
