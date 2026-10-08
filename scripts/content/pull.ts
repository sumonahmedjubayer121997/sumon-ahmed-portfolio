/**
 * Build-time content pull.
 *
 *   tsx scripts/content/pull.ts [--mode production|development|emulators]
 *
 * Reads published content from Firestore (public, rule-protected reads — no
 * service account needed), validates it against the zod schemas and writes
 * src/generated/content.json, which the site imports. Visitors never hit
 * Firestore at runtime.
 *
 * CONTENT_SOURCE=auto (default) falls back to the bundled seed content when
 * Firestore isn't configured or reachable. CI sets CONTENT_SOURCE=firestore so
 * a deploy can never silently ship placeholder content.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { initializeApp } from 'firebase/app';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setLogLevel,
  where,
  type Firestore,
} from 'firebase/firestore/lite';
import type { ZodType } from 'zod';
import {
  collections,
  contentBundleSchema,
  milestoneSchema,
  postSchema,
  projectSchema,
  researchSchema,
  siteSchema,
  skillGroupSchema,
  type ContentBundle,
} from '../../src/content/schema';
import { seedContent } from '../../src/content/seed';
import { EMULATOR_PORTS, readFirebaseEnv } from '../../src/content/firebaseEnv';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outFile = resolve(root, 'src/generated/content.json');
const modeArg = process.argv.indexOf('--mode');
const mode = modeArg > -1 ? process.argv[modeArg + 1] : 'development';
const env = loadEnv(mode, root, ['VITE_', 'CONTENT_']);
const source = (env.CONTENT_SOURCE || 'auto') as 'auto' | 'firestore' | 'seed';

class ContentError extends Error {}

function parse<T>(schema: ZodType<T>, data: unknown, where: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  • ${where}.${i.path.join('.')}: ${i.message}`).join('\n');
    throw new ContentError(`Invalid content in ${where}:\n${issues}`);
  }
  return result.data;
}

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)),
  ]);

async function pullFromFirestore(db: Firestore, projectId: string): Promise<ContentBundle> {
  const single = async <T>(c: { path: string; id: string }, schema: ZodType<T>) => {
    const snap = await getDoc(doc(db, c.path, c.id));
    if (!snap.exists())
      throw new ContentError(`Missing ${c.path}/${c.id} — open /admin and import the starter content.`);
    return parse(schema, snap.data(), `${c.path}/${c.id}`);
  };
  const many = async <T extends { order: number }>(path: string, schema: ZodType<T>) => {
    const snap = await getDocs(query(collection(db, path), where('published', '==', true)));
    return snap.docs.map((d) => parse(schema, d.data(), `${path}/${d.id}`)).sort((a, b) => a.order - b.order);
  };

  const [site, research, projects, experience, skills, posts] = await Promise.all([
    single(collections.site, siteSchema),
    single(collections.research, researchSchema),
    many(collections.projects, projectSchema),
    many(collections.experience, milestoneSchema),
    many(collections.skills, skillGroupSchema),
    many(collections.posts, postSchema),
  ]);
  if (!projects.length) throw new ContentError('No published projects in Firestore.');
  return {
    site,
    research,
    projects,
    experience,
    skills,
    posts,
    meta: { source: 'firestore', pulledAt: new Date().toISOString(), projectId },
  };
}

function seedBundle(): ContentBundle {
  return { ...seedContent(), meta: { source: 'seed', pulledAt: new Date().toISOString() } };
}

async function main() {
  let bundle: ContentBundle;
  const cfg = readFirebaseEnv(env);

  if (source === 'seed' || (!cfg && source === 'auto')) {
    bundle = seedBundle();
    console.log(`[content] using bundled seed content${cfg ? '' : ' (no VITE_FIREBASE_PROJECT_ID configured)'}`);
  } else {
    if (!cfg) throw new ContentError('CONTENT_SOURCE=firestore but VITE_FIREBASE_PROJECT_ID is not set.');
    setLogLevel('silent'); // errors are reported below in one line
    const app = initializeApp(cfg, `content-pull-${Date.now()}`);
    const db = getFirestore(app);
    if (cfg.useEmulators) connectFirestoreEmulator(db, '127.0.0.1', EMULATOR_PORTS.firestore);
    try {
      bundle = await withTimeout(pullFromFirestore(db, cfg.projectId), 15000);
      console.log(
        `[content] pulled from Firestore${cfg.useEmulators ? ' (emulator)' : ''} · ${cfg.projectId} · ` +
          `${bundle.projects.length} projects, ${bundle.experience.length} milestones, ` +
          `${bundle.skills.length} skill groups, ${bundle.posts.length} posts`,
      );
    } catch (err) {
      // Invalid content always fails — publishing broken content must never succeed silently.
      if (source === 'firestore' || (err instanceof ContentError && !/^Missing|^No published/.test(err.message)))
        throw err;
      console.warn(`[content] Firestore unavailable (${(err as Error).message}) — falling back to seed content.`);
      bundle = seedBundle();
    }
  }

  const validated = parse(contentBundleSchema, bundle, 'bundle');
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(validated, null, 2) + '\n');
}

main().catch((err) => {
  console.error(`[content] ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
