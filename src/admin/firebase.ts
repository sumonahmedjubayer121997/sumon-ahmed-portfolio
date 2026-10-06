import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, type Firestore } from 'firebase/firestore/lite';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';
import { EMULATOR_PORTS, readFirebaseEnv } from '@/content/firebaseEnv';

/** Firebase config from VITE_FIREBASE_* — null when the project isn't configured yet. */
export const firebaseEnv = readFirebaseEnv(import.meta.env as Record<string, string | boolean | undefined>);

interface Services {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

let services: Services | null = null;

/** Lazily initialised Firebase services (the SDK only ships in the /admin chunk). */
export function firebase(): Services {
  if (services) return services;
  if (!firebaseEnv) throw new Error('Firebase is not configured — set VITE_FIREBASE_* (see .env.example).');
  const app = initializeApp(firebaseEnv);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  const storage = getStorage(app);
  if (firebaseEnv.useEmulators) {
    connectAuthEmulator(auth, `http://127.0.0.1:${EMULATOR_PORTS.auth}`, { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', EMULATOR_PORTS.firestore);
    connectStorageEmulator(storage, '127.0.0.1', EMULATOR_PORTS.storage);
  }
  services = { app, auth, db, storage };
  return services;
}
