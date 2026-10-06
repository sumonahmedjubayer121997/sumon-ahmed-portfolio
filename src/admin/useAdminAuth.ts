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
      const code = (e as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError((e as Error).message);
      }
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
