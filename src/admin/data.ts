import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore/lite';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { ZodType } from 'zod';
import { collections } from '@/content/schema';
import { seedContent } from '@/content/seed';
import { firebase } from './firebase';

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

export async function hasContent() {
  return (await getDoc(doc(firebase().db, collections.site.path, collections.site.id))).exists();
}

/** Populates an empty project with the stage-1 starter content (placeholders flagged). */
export async function importStarterContent() {
  const { db } = firebase();
  const seed = seedContent();
  const batch = writeBatch(db);
  const stamp = { updatedAt: serverTimestamp() };
  batch.set(doc(db, collections.site.path, collections.site.id), { ...seed.site, ...stamp });
  batch.set(doc(db, collections.research.path, collections.research.id), { ...seed.research, ...stamp });
  seed.projects.forEach((p) => batch.set(doc(db, collections.projects, p.slug), { ...p, ...stamp }));
  seed.experience.forEach((m) => batch.set(doc(db, collections.experience, m.id), { ...m, ...stamp }));
  seed.skills.forEach((g) => batch.set(doc(db, collections.skills, g.id), { ...g, ...stamp }));
  await batch.commit();
}

/** Uploads an image to Storage under content/ and returns its public URL. */
export async function uploadImage(file: File, folder: string) {
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  const r = ref(firebase().storage, `content/${folder}/${Date.now()}-${safe}`);
  await uploadBytes(r, file, { contentType: file.type, cacheControl: 'public, max-age=31536000' });
  return getDownloadURL(r);
}
