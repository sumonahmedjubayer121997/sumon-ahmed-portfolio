import { readFirebaseEnv, type FirebaseEnv } from '@/content/firebaseEnv';
import { firebaseEnv } from '../firebase';

/**
 * Where the studio's AI requests go (Gemini through Firebase AI Logic). Kept free
 * of the SDK, so editors can decide whether to show the AI panel without loading it.
 *
 * Gemini's free tier only applies to projects without billing. The main project
 * is on Blaze (Cloud Storage requires it), so AI can run through a separate,
 * billing-free Firebase project: set VITE_AI_FIREBASE_* (same keys as
 * VITE_FIREBASE_*). Without them, AI uses the main project (paid tier, prepaid credit).
 *
 * App Check belongs to whichever project serves AI: VITE_RECAPTCHA_SITE_KEY for the
 * live site, and VITE_APPCHECK_DEBUG_TOKEN (in .env.development.local) for localhost.
 */
const env = import.meta.env as Record<string, string | boolean | undefined>;
const separate = readFirebaseEnv(
  Object.fromEntries(
    Object.entries(env)
      .filter(([k]) => k.startsWith('VITE_AI_FIREBASE_'))
      .map(([k, v]) => [k.replace('VITE_AI_FIREBASE_', 'VITE_FIREBASE_'), v]),
  ),
);

/** The project serving AI, and whether it is the main project (then its app is shared). */
export const aiProject: { config: FirebaseEnv; shared: boolean } | null = separate
  ? { config: separate, shared: false }
  : firebaseEnv && !firebaseEnv.useEmulators
    ? { config: firebaseEnv, shared: true }
    : null;

const SITE_KEY = (env.VITE_RECAPTCHA_SITE_KEY as string | undefined) ?? '';
// Only `npm run dev` reads .env.development.local, so builds never contain the debug token.
const DEBUG_TOKEN = import.meta.env.DEV ? ((env.VITE_APPCHECK_DEBUG_TOKEN as string | undefined) ?? '') : '';

export const aiConfig = { siteKey: SITE_KEY, debugToken: DEBUG_TOKEN };

export const aiUnavailable: string | null = !aiProject
  ? firebaseEnv?.useEmulators
    ? 'AI isn’t available with the local emulators — use `npm run dev`, or set VITE_AI_FIREBASE_*.'
    : 'Firebase isn’t configured.'
  : !SITE_KEY && !DEBUG_TOKEN
    ? 'Set VITE_RECAPTCHA_SITE_KEY (App Check) to use AI.'
    : null;
