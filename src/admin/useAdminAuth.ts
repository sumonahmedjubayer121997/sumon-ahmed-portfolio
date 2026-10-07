import { useCallback, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore/lite';
import { firebase, firebaseEnv } from './firebase';

/** Setup problems explained in plain language, with where to fix them. */
const SIGN_IN_ERRORS: Record<string, string> = {
  'auth/operation-not-allowed':
    'Google sign-in isn’t enabled for this Firebase project. In the Firebase console open Authentication → Sign-in method → Add new provider → Google, switch it on and save.',
  'auth/configuration-not-found':
    'Firebase Authentication hasn’t been set up for this project yet. In the Firebase console open Authentication and click “Get started”, then enable Google sign-in.',
  'auth/unauthorized-domain': `This address (${typeof window !== 'undefined' ? window.location.hostname : 'this domain'}) isn’t allowed to sign in. In the Firebase console open Authentication → Settings → Authorized domains and add it.`,
  'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.',
  'auth/network-request-failed': 'Couldn’t reach Firebase. Check your connection and try again.',
};

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'not-admin'; user: User }
  | { status: 'admin'; user: User };

/**
 * Google sign-in plus an admin check: a user is an admin when admins/{uid}
 * exists in Firestore (created once by hand in the Firebase console).
 */
export function useAdminAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async (user: User | null) => {
    if (!user) return setState({ status: 'signed-out' });
    try {
      const snap = await getDoc(doc(firebase().db, 'admins', user.uid));
      setState(snap.exists() ? { status: 'admin', user } : { status: 'not-admin', user });
    } catch {
      setState({ status: 'not-admin', user });
    }
  }, []);

  useEffect(() => onAuthStateChanged(firebase().auth, (user) => void check(user)), [check]);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      await signInWithPopup(firebase().auth, new GoogleAuthProvider());
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      setError(SIGN_IN_ERRORS[code] ?? (e as Error).message);
    }
  }, []);

  /** Emulator only: sign in with a fake Google identity (no popup) for local testing. */
  const signInTestAccount = useCallback(async () => {
    if (!firebaseEnv?.useEmulators) return;
    const token = JSON.stringify({
      sub: 'local-admin',
      email: 'admin@example.test',
      email_verified: true,
      name: 'Local Admin',
    });
    await signInWithCredential(firebase().auth, GoogleAuthProvider.credential(token));
  }, []);

  const signOut = useCallback(() => fbSignOut(firebase().auth), []);
  const recheck = useCallback(() => check(firebase().auth.currentUser), [check]);

  return { state, error, signIn, signInTestAccount, signOut, recheck };
}
