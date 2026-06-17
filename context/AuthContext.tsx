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
 * Auto-refreshes profile photo whenever the app comes back to the foreground.
 * Mount this once at the root layout so it runs for the entire session lifetime.
 *
 * Why: photoUrl is set at login time. If the user (or an admin) uploads a photo
 * after login, the in-memory session still holds the old (null) value until the
 * user re-logs in. This hook silently re-downloads the photo each time the app
 * becomes active and updates the session so all components reflect the new image.
 */
export function usePhotoSync() {
  const { session, setSession } = useAuth();
  // Keep a ref so the AppState callback always reads the latest session
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const setSessionRef = useRef(setSession);
  useEffect(() => { setSessionRef.current = setSession; }, [setSession]);

  useEffect(() => {
    async function syncPhoto() {
      const s = sessionRef.current;
      if (!s?.token) return;

      try {
        const freshUri = await downloadProfilePhoto(s.token);
        // Only update if the URI actually changed (avoids unnecessary re-renders)
        if (freshUri !== s.photoUrl) {
          setSessionRef.current({ ...s, photoUrl: freshUri });
        }
      } catch {
        // Silently ignore — photo sync is best-effort
      }
    }

    // Sync once immediately when the hook mounts (covers the "already logged in" case)
    syncPhoto();

    // Then sync every time the app comes back to the foreground
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') syncPhoto();
    });

    return () => sub.remove();
  }, []); // empty deps — runs once, reads latest session via refs
}
