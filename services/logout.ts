import type { Router } from 'expo-router';

import { postLogout } from './authService';
import type { AuthSession } from '../context/AuthContext';

export async function performLogout(opts: {
  session: AuthSession | null;
  setSession: (s: AuthSession | null) => void;
  router: Router;
}) {
  const { session, setSession, router } = opts;

  // Logout from the server
  const token = session?.token;
  if (token) {
    try {
      await postLogout(token);
    } catch {
    }
  }
  // Set the session to null and redirect to the login screen
  setSession(null);
  router.replace('/login');
}

