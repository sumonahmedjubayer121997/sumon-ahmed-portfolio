import { AIError, getAI, getGenerativeModel, GoogleAIBackend, type AI, type ObjectSchema } from 'firebase/ai';
import { getApps, initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { firebase } from '../firebase';
import { aiConfig, aiProject } from './config';

/**
 * Gemini through Firebase AI Logic (Gemini Developer API) — see config.ts for which
 * project serves it. App Check proves requests come from this site: reCAPTCHA
 * Enterprise on the live domains, a registered debug token on localhost. Loaded
 * only when the studio's AI panel is used.
 */

/**
 * Newest first. Which models the free tier offers (and each one's daily allowance)
 * changes, so on "not found" or "no allowance" the next one is tried, and the
 * first that answers is remembered.
 */
const MODELS = [
  import.meta.env.VITE_GEMINI_MODEL as string | undefined,
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
].filter((m): m is string => !!m);
const MODEL_KEY = 'ai:model';

let ai: AI | null = null;

function connect(): AI {
  if (ai) return ai;
  if (!aiProject) throw new Error('AI isn’t configured.');
  const app = aiProject.shared
    ? firebase().app
    : (getApps().find((a) => a.name === 'ai') ?? initializeApp(aiProject.config, 'ai'));
  if (aiConfig.debugToken) {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = aiConfig.debugToken;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(aiConfig.siteKey || 'debug-only'),
    isTokenAutoRefreshEnabled: true,
  });
  ai = getAI(app, { backend: new GoogleAIBackend() });
  return ai;
}

/** A plain-language explanation for the errors people actually hit. */
export function explain(e: unknown): string {
  const err = e as AIError & { customErrorData?: { status?: number } };
  const status = err.customErrorData?.status;
  const msg = String(err?.message ?? e);
  if (/prepay|credits are depleted|billing/i.test(msg))
    return 'Gemini is treating this project as a paid (billed) project with no credit, so the free tier doesn’t apply. In AI Studio (ai.studio/projects) check the project’s tier, or unlink billing from the Firebase project to return it to the free Spark plan.';
  if (status === 429 || /quota|RESOURCE_EXHAUSTED|rate limit/i.test(msg))
    return 'The free Gemini allowance is used up for now. It resets at midnight Pacific time — or wait a minute if you sent several requests quickly.';
  if (/app.?check|attestation|recaptcha/i.test(msg) || status === 401)
    return 'App Check rejected the request. On localhost, check the debug token in .env.development.local is registered in Firebase → App Check → Manage debug tokens. On the live site, check sumonahmed.web.app is in the reCAPTCHA key’s domains.';
  if (/not been used|disabled|SERVICE_DISABLED|api-not-enabled/i.test(msg) || status === 403)
    return 'Firebase AI Logic isn’t switched on for this project yet: Firebase console → AI Services → AI Logic → Get started → Gemini Developer API.';
  if (/fetch|network|Failed to fetch/i.test(msg)) return 'Couldn’t reach Gemini — check your connection and try again.';
  return `Gemini returned an error: ${msg.replace(/^.*?\]\s*/, '').slice(0, 300)}`;
}

/** Worth trying the next model: this one doesn't exist, or has no allowance left (allowances are per model). */
const tryNext = (e: unknown) => {
  const err = e as AIError & { customErrorData?: { status?: number } };
  const status = err.customErrorData?.status;
  return status === 404 || status === 429 || /not found|is not supported|unknown model/i.test(String(err?.message));
};

/**
 * One structured request: returns the parsed JSON that matches `schema`.
 * Tries the models in order until one exists, and remembers it.
 */
export async function generateJson<T>(opts: {
  system: string;
  prompt: string;
  schema: ObjectSchema;
  temperature?: number;
}): Promise<{ data: T; model: string }> {
  const instance = connect();
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(MODEL_KEY);
  } catch {
    /* storage blocked */
  }
  const order = saved && MODELS.includes(saved) ? [saved, ...MODELS.filter((m) => m !== saved)] : MODELS;
  const failures: unknown[] = [];
  for (const name of order) {
    const model = getGenerativeModel(instance, {
      model: name,
      systemInstruction: opts.system,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: opts.schema,
        temperature: opts.temperature ?? 0.4,
      },
    });
    try {
      const res = await model.generateContent(opts.prompt);
      const text = res.response.text();
      try {
        localStorage.setItem(MODEL_KEY, name);
      } catch {
        /* storage blocked */
      }
      return { data: JSON.parse(text) as T, model: name };
    } catch (e) {
      failures.push(e);
      if (!tryNext(e)) break;
    }
  }
  // Explain the most telling failure: a real quota or billing problem rather than "model not found".
  const telling =
    failures.find((e) => !/not found|is not supported|unknown model/i.test(String((e as Error)?.message))) ??
    failures.at(-1);
  throw new Error(explain(telling), { cause: telling });
}
