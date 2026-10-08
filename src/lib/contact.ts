/**
 * Contact form → Firestore (messages/{id}). The Firebase SDK is loaded the first
 * time someone starts filling in the form, so it never weighs on page load.
 * firestore.rules decides what may be written; this module only sends.
 */
import { EMULATOR_PORTS, readFirebaseEnv } from '@/content/firebaseEnv';

const env = readFirebaseEnv(import.meta.env as Record<string, string | boolean | undefined>);

/** False when the site was built without a Firebase config (the form then falls back to email). */
export const contactAvailable = !!env;

export interface OutgoingMessage {
  name: string;
  email: string;
  message: string;
  /** Honeypot: a hidden field people never fill in. */
  website: string;
  /** Milliseconds between the first keystroke and sending. */
  fillMs: number;
  page: string;
}

type Sender = (m: OutgoingMessage) => Promise<void>;
let sender: Promise<Sender> | null = null;

/** Starts loading the SDK (call on first focus); resolves to the send function. */
export function prepareContact(): Promise<Sender> {
  if (!env) return Promise.reject(new Error('Contact form is not configured'));
  sender ??= (async () => {
    const [{ initializeApp, getApps }, fs] = await Promise.all([
      import('firebase/app'),
      import('firebase/firestore/lite'),
    ]);
    const app = getApps().find((a) => a.name === 'contact') ?? initializeApp(env, 'contact');
    const db = fs.getFirestore(app);
    if (env.useEmulators) fs.connectFirestoreEmulator(db, '127.0.0.1', EMULATOR_PORTS.firestore);
    return async (m: OutgoingMessage) => {
      await fs.addDoc(fs.collection(db, 'messages'), { ...m, status: 'new', createdAt: fs.serverTimestamp() });
    };
  })();
  sender.catch(() => (sender = null));
  return sender;
}

/** One message per browser per minute — a courtesy limit; the rules do the real checking. */
const LAST_SENT = 'contact:last-sent';
export function recentlySent(withinMs = 60_000) {
  try {
    return Date.now() - Number(localStorage.getItem(LAST_SENT) ?? 0) < withinMs;
  } catch {
    return false;
  }
}
export function markSent() {
  try {
    localStorage.setItem(LAST_SENT, String(Date.now()));
  } catch {
    /* private mode: fine */
  }
}
