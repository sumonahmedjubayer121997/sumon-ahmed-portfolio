/**
 * Firebase web configuration from environment variables (VITE_FIREBASE_*).
 * The web config is not secret — Firestore/Storage rules are what protect data.
 */
export interface FirebaseEnv {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  appId: string;
  /** Connect to the local Emulator Suite instead of the real project. */
  useEmulators: boolean;
}

export function readFirebaseEnv(env: Record<string, string | boolean | undefined>): FirebaseEnv | null {
  const get = (k: string) => (typeof env[k] === 'string' ? (env[k] as string).trim() : '');
  const projectId = get('VITE_FIREBASE_PROJECT_ID');
  if (!projectId) return null;
  return {
    apiKey: get('VITE_FIREBASE_API_KEY') || 'demo-api-key',
    authDomain: get('VITE_FIREBASE_AUTH_DOMAIN') || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: get('VITE_FIREBASE_STORAGE_BUCKET') || `${projectId}.firebasestorage.app`,
    appId: get('VITE_FIREBASE_APP_ID') || 'demo-app-id',
    useEmulators: get('VITE_FIREBASE_EMULATORS') === 'true',
  };
}

export const EMULATOR_PORTS = { auth: 9099, firestore: 8080, storage: 9199 } as const;
