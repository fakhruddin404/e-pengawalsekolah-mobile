import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { downloadProfilePhoto } from '../services/profileService';

// define user session data
export type AuthSession = {
  token: string;
  displayName: string;
  photoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  ic?: string | null;
  isEmailVerified?: boolean;
};

type AuthContextValue = {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);

  const setSession = useCallback((next: AuthSession | null) => {
    setSessionState(next);
  }, []);

  const value = useMemo(
    () => ({ session, setSession }),
    [session, setSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

/**
 * Auto-refreshes profile photo:
 *  1. Immediately when the user logs in (token changes from null → value)
 *  2. Every time the app returns to foreground
 *
 * Bug that was here before: empty deps [] meant this only ran at mount when
 * session = null (a no-op), so the photo never synced after login.
 */
export function usePhotoSync() {
  const { session, setSession } = useAuth();

  useEffect(() => {
    // Not logged in yet — nothing to do
    if (!session?.token) return;

    let cancelled = false;
    const token = session.token;

    async function syncPhoto() {
      try {
        const freshUri = await downloadProfilePhoto(token);
        if (cancelled) return;
        if (freshUri) {
          // Always update — the ?ts= suffix changes each call, comparison would mislead
          setSession({ ...sessionRef.current!, photoUrl: freshUri });
        }
      } catch {
        // Best-effort — silently ignore network/FS errors
      }
    }

    // Run immediately on login (the main fix)
    syncPhoto();

    // Also run every time the app comes back to the foreground
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') syncPhoto();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [session?.token]); // ← KEY FIX: re-runs when token changes (login event)

  // Keep a ref so AppState callback inside the effect can read the latest session
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);
}
