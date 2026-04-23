import type { Router } from 'expo-router';

import { postLogout } from './authService';
import type { AuthSession } from '../context/AuthContext';

export async function performLogout(opts: {
  session: AuthSession | null;
  setSession: (s: AuthSession | null) => void;
  router: Router;
}) {
  const { session, setSession, router } = opts;

  // Best-effort server token revocation. Local logout must always succeed.
  const token = session?.token;
  if (token) {
    try {
      await postLogout(token);
    } catch {
      // ignore
    }
  }

  setSession(null);
  router.replace('/login');
}

