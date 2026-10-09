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
 * Newest first. Which models a project can use (and each one's allowance) changes,
 * so on "not found" or "no allowance" the next one is tried, and the first that
 * answers is remembered. (The 2.5 models are closed to new users as of Oct 2026.)
 */
const MODELS = [
  import.meta.env.VITE_GEMINI_MODEL as string | undefined,
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
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

/** Gemini overloaded or briefly failing — free-tier requests are the first turned away at busy times. */
const busy = (status: number | undefined, msg: string) =>
  (status !== undefined && status >= 500) || /high demand|overloaded|UNAVAILABLE|try again later/i.test(msg);

/** A plain-language explanation for the errors people actually hit. */
export function explain(e: unknown): string {
  const err = e as AIError & { customErrorData?: { status?: number } };
  const status = err.customErrorData?.status;
  const msg = String(err?.message ?? e);
  const project = aiProject?.config.projectId ?? 'this project';
  if (/prepay|credits are depleted|billing/i.test(msg))
    return `Gemini is treating ${project} as a paid (billed) project with no credit — Gemini’s free tier doesn’t apply to projects on the Blaze plan. Add prepaid credit in AI Studio (ai.studio/projects → ${project} → Set up Prepay), or point VITE_AI_FIREBASE_* at a separate billing-free project.`;
  if (status === 429 || /quota|RESOURCE_EXHAUSTED|rate limit/i.test(msg))
    return 'The free Gemini allowance is used up for now. It resets at midnight Pacific time — or wait a minute if you sent several requests quickly.';
  if (/app.?check|attestation|recaptcha/i.test(msg) || status === 401)
    return aiConfig.debugToken
      ? 'App Check rejected the request. Check the debug token in .env.development.local is registered in Firebase → App Check → Apps → ⋮ → Manage debug tokens.'
      : `App Check rejected the request. The reCAPTCHA key must be created in the same Google Cloud project as this app (${project}) with the reCAPTCHA Enterprise API enabled, list ${location.hostname} in its domains, and be the key registered for the web app in Firebase → App Check.`;
  if (/not been used|disabled|SERVICE_DISABLED|api-not-enabled/i.test(msg) || status === 403)
    return 'Firebase AI Logic isn’t switched on for this project yet: Firebase console → AI Services → AI Logic → Get started → Gemini Developer API.';
  if (busy(status, msg))
    return 'Gemini is busy right now (free-tier requests are the first to wait at busy times). Try again in a minute — your notes are kept.';
  // Every AI error says "Error fetching from …", so only a real network failure counts here.
  if (/Failed to fetch|NetworkError|network error|ERR_INTERNET/i.test(msg))
    return 'Couldn’t reach Gemini — check your connection and try again.';
  return `Gemini returned an error: ${msg.replace(/^.*?\]\s*/, '').slice(0, 300)}`;
}

/** The model is gone for good (retired or unknown), not just busy or out of allowance. */
const gone = (e: unknown) => {
  const err = e as AIError & { customErrorData?: { status?: number } };
  return (
    err.customErrorData?.status === 404 ||
    /not found|is not supported|unknown model|no longer available/i.test(String(err?.message))
  );
};

/**
 * Worth trying the next model: this one doesn't exist, has no allowance left
 * (allowances are per model), or is overloaded right now.
 */
const tryNext = (e: unknown) => {
  const err = e as AIError & { customErrorData?: { status?: number } };
  const status = err.customErrorData?.status;
  const msg = String(err?.message);
  return status === 404 || status === 429 || busy(status, msg) || /not found|is not supported|unknown model/i.test(msg);
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
      // Remember it only if the newer ones are gone for good, so a busy moment doesn't pin an older model.
      if (failures.every(gone)) {
        try {
          localStorage.setItem(MODEL_KEY, name);
        } catch {
          /* storage blocked */
        }
      }
      return { data: JSON.parse(text) as T, model: name };
    } catch (e) {
      failures.push(e);
      if (!tryNext(e)) break;
    }
  }
  // Explain the most telling failure: a real quota, billing or busy problem rather than "model not found".
  const telling = failures.find((e) => !gone(e)) ?? failures.at(-1);
  throw new Error(explain(telling), { cause: telling });
}
