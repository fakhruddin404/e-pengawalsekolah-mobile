import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import type { Router } from 'expo-router';

import { postLogout } from './authService';
import type { AuthSession } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';

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
    } catch (e) {
      console.log('Logout API failed or network error:', e);
    }
  }
  // Set the session to null and redirect to the login screen
  setSession(null);
  router.replace('/login');
}

/**
 * A hook to attempt to log the user out when the app is cleared from the recents list
 * or closed. React Native doesn't guarantee execution on app kill, but returning a cleanup 
 * function and listening to AppState is the best effort approach.
 */
export function useAutoLogoutOnAppClear() {
  const { session, setSession } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!session?.token) return;
    
    // Attempt to log out if the component unmounts (sometimes triggered on app close)
    return () => {
      postLogout(session.token).catch(() => {});
    };
  }, [session?.token]);

  // Optional: If you strictly want to log out when the app goes to background (like banking apps)
  // you can uncomment this block. However, for most apps, just the unmount cleanup is preferred 
  // so users aren't logged out when they temporarily switch apps.
  /*
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (session?.token) {
           performLogout({ session, setSession, router });
        }
      }
    });
    return () => subscription.remove();
  }, [session, setSession, router]);
  */
}
