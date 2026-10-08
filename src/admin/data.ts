import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore/lite';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { ZodType } from 'zod';
import { collections } from '@/content/schema';
import { seedContent } from '@/content/seed';
import { firebase } from './firebase';
import { stripMeta } from './useDraft';

export interface Issue {
  path: string;
  message: string;
}

export type Validated<T> = { ok: true; data: T } | { ok: false; issues: Issue[] };

/** Validate an editor draft against its content schema. */
export function validate<T>(schema: ZodType<T>, data: unknown): Validated<T> {
  const r = schema.safeParse(data);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, issues: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) };
}

type WithMeta<T> = T & { updatedAt?: { toDate(): Date } };

export async function loadDoc<T>(path: string, id: string): Promise<WithMeta<T> | null> {
  const snap = await getDoc(doc(firebase().db, path, id));
  return snap.exists() ? (snap.data() as WithMeta<T>) : null;
}

export async function loadCollection<T extends { order?: number }>(path: string): Promise<Array<WithMeta<T>>> {
  const snap = await getDocs(collection(firebase().db, path));
  return snap.docs.map((d) => d.data() as WithMeta<T>).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Writes a validated document. `updatedAt` is server-stamped (and ignored by the build). */
export async function saveDoc(path: string, id: string, data: object) {
  await setDoc(doc(firebase().db, path, id), { ...data, updatedAt: serverTimestamp() });
}

export async function removeDoc(path: string, id: string) {
  await deleteDoc(doc(firebase().db, path, id));
}

/** Saves a whole ordered collection in one batch and deletes removed documents. */
export async function saveCollection(path: string, items: Array<{ id: string; data: object }>, removed: string[]) {
  const { db } = firebase();
  const batch = writeBatch(db);
  items.forEach(({ id, data }) => batch.set(doc(db, path, id), { ...data, updatedAt: serverTimestamp() }));
  removed.forEach((id) => batch.delete(doc(db, path, id)));
  await batch.commit();
}

export const contentParts = ['site', 'research', 'projects', 'experience', 'skills', 'posts'] as const;
export type ContentPart = (typeof contentParts)[number];

export const partLabels: Record<ContentPart, string> = {
  site: 'Profile',
  research: 'Research',
  projects: 'Projects',
  experience: 'Experience',
  skills: 'Skills',
  posts: 'Blog posts',
};

/** Sections with no content in Firestore yet (a missing document or an empty collection). */
export async function emptyParts(): Promise<ContentPart[]> {
  const { db } = firebase();
  const checks = await Promise.all(
    contentParts.map(async (part) => {
      if (part === 'site' || part === 'research') {
        const c = collections[part];
        return !(await getDoc(doc(db, c.path, c.id))).exists();
      }
      return (await getDocs(query(collection(db, collections[part]), limit(1)))).empty;
    }),
  );
  return contentParts.filter((_, i) => checks[i]);
}

/** Writes the starter content (placeholders flagged) for the given sections, in one batch. */
export async function importStarterContent(parts: readonly ContentPart[] = contentParts) {
  const { db } = firebase();
  const seed = seedContent();
  const batch = writeBatch(db);
  const stamp = { updatedAt: serverTimestamp() };
  const want = new Set(parts);
  if (want.has('site')) batch.set(doc(db, collections.site.path, collections.site.id), { ...seed.site, ...stamp });
  if (want.has('research'))
    batch.set(doc(db, collections.research.path, collections.research.id), { ...seed.research, ...stamp });
  if (want.has('projects'))
    seed.projects.forEach((p) => batch.set(doc(db, collections.projects, p.slug), { ...p, ...stamp }));
  if (want.has('experience'))
    seed.experience.forEach((m) => batch.set(doc(db, collections.experience, m.id), { ...m, ...stamp }));
  if (want.has('skills')) seed.skills.forEach((g) => batch.set(doc(db, collections.skills, g.id), { ...g, ...stamp }));
  if (want.has('posts')) seed.posts.forEach((p) => batch.set(doc(db, collections.posts, p.slug), { ...p, ...stamp }));
  await batch.commit();
}

/** Uploads an image to Storage under content/ and returns its public URL. */
export async function uploadImage(file: File, folder: string) {
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  const r = ref(firebase().storage, `content/${folder}/${Date.now()}-${safe}`);
  await uploadBytes(r, file, { contentType: file.type, cacheControl: 'public, max-age=31536000' });
  return getDownloadURL(r);
}

/* ───────────────────────── Starter content updates ───────────────────────── */

/** JSON with sorted keys (Firestore returns map keys in any order); undefined fields are skipped. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

/** Fingerprint of the bundled starter content: changes whenever the starter data is improved. */
export const starterVersion = (() => {
  const s = stable(seedContent());
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
})();

/** Admin-only marker (unpublished, so never public or pulled) recording the starter version last reviewed. */
const STARTER_MARKER = { path: collections.site.path, id: 'starter' };

export interface StarterUpdate {
  label: string;
  path: string;
  id: string;
  /** Top-level fields that differ from the latest starter version. */
  changed: string[];
  data: object;
  /** Set when the document was saved after the import, i.e. it may hold your own edits. */
  editedAt: Date | null;
}

/**
 * Starter documents in Firestore that differ from the latest bundled starter
 * content — offered once per starter version, so improvements to the starter
 * data can reach a project that was imported earlier.
 */
export async function starterUpdates(): Promise<StarterUpdate[]> {
  const seed = seedContent();
  const [site, research, projects, experience, skills, posts, marker] = await Promise.all([
    loadDoc<object>(collections.site.path, collections.site.id),
    loadDoc<object>(collections.research.path, collections.research.id),
    loadCollection<{ slug: string; order?: number }>(collections.projects),
    loadCollection<{ id: string; order?: number }>(collections.experience),
    loadCollection<{ id: string; order?: number }>(collections.skills),
    loadCollection<{ slug: string; order?: number }>(collections.posts),
    loadDoc<{ reviewed?: string }>(STARTER_MARKER.path, STARTER_MARKER.id),
  ]);
  if (marker?.reviewed === starterVersion) return [];

  type Current = WithMeta<object> | null | undefined;
  const pairs: Array<[string, string, string, Current, object]> = [
    ['Profile', collections.site.path, collections.site.id, site, seed.site],
    ['Research', collections.research.path, collections.research.id, research, seed.research],
    ...seed.projects.map((p): [string, string, string, Current, object] => [
      `${p.index} ${p.title}`,
      collections.projects,
      p.slug,
      projects.find((x) => x.slug === p.slug),
      p,
    ]),
    ...seed.experience.map((m): [string, string, string, Current, object] => [
      `Experience · ${m.year}`,
      collections.experience,
      m.id,
      experience.find((x) => x.id === m.id),
      m,
    ]),
    ...seed.skills.map((g): [string, string, string, Current, object] => [
      `Skills · ${g.label}`,
      collections.skills,
      g.id,
      skills.find((x) => x.id === g.id),
      g,
    ]),
    ...seed.posts.map((p): [string, string, string, Current, object] => [
      `Blog · ${p.title}`,
      collections.posts,
      p.slug,
      posts.find((x) => x.slug === p.slug),
      p,
    ]),
  ];

  // The import writes every document in one batch with one server timestamp;
  // anything saved later has been edited in the studio.
  const time = (d: Current) => d?.updatedAt?.toDate().getTime();
  const stamps = pairs.map(([, , , cur]) => time(cur)).filter((t): t is number => t !== undefined);
  const importedAt = stamps.length ? Math.min(...stamps) : 0;

  const updates: StarterUpdate[] = [];
  for (const [label, path, id, cur, next] of pairs) {
    if (!cur) continue; // deleted or never imported: not resurrected here
    const current = stripMeta(cur) as Record<string, unknown>;
    const target = next as Record<string, unknown>;
    const changed = [...new Set([...Object.keys(current), ...Object.keys(target)])].filter(
      (k) => stable(current[k]) !== stable(target[k]),
    );
    if (!changed.length) continue;
    const t = time(cur);
    updates.push({ label, path, id, changed, data: next, editedAt: t && t > importedAt ? new Date(t) : null });
  }
  return updates;
}

/** Replaces the chosen documents with their latest starter version and records the review. */
export async function applyStarterUpdates(selected: StarterUpdate[]) {
  const { db } = firebase();
  const batch = writeBatch(db);
  selected.forEach((u) => batch.set(doc(db, u.path, u.id), { ...u.data, updatedAt: serverTimestamp() }));
  batch.set(doc(db, STARTER_MARKER.path, STARTER_MARKER.id), {
    published: false,
    reviewed: starterVersion,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}
