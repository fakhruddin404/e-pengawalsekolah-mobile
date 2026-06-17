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

// ─────────────────────────────────────────────────────────────
// Jenis data sesi pengguna yang disimpan selepas login
// ─────────────────────────────────────────────────────────────
export type AuthSession = {
  token: string;         // Bearer token untuk API calls
  displayName: string;   // Nama pengawal untuk dipapar
  photoUrl?: string | null; // URI file:// tempatan (bukan URL server)
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

// ─────────────────────────────────────────────────────────────
// AuthProvider — bungkus seluruh app supaya semua screen
// boleh baca dan tulis sesi melalui useAuth()
// ─────────────────────────────────────────────────────────────
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
  if (!ctx) throw new Error('useAuth mesti digunakan dalam AuthProvider');
  return ctx;
}

// ─────────────────────────────────────────────────────────────
// usePhotoSync — auto-refresh gambar profil tanpa perlu logout
//
// Dipanggil dalam dua situasi:
//   1. Masa login (session.token bertukar dari null → ada nilai)
//   2. Setiap kali app kembali ke foreground (user tukar app, pastu balik)
//
// Kenapa perlu ini?
//   → photoUrl disimpan dalam session masa login sahaja.
//   → Kalau gambar diupload selepas login (contoh: melalui web admin),
//     session lama masih simpan photoUrl = null.
//   → Hook ini refresh gambar secara senyap tanpa user perlu logout/login semula.
// ─────────────────────────────────────────────────────────────
export function usePhotoSync() {
  const { session, setSession } = useAuth();

  // Ref untuk baca session terkini dalam AppState callback
  // (tanpa ini, callback akan baca nilai lama - "stale closure")
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  useEffect(() => {
    // Belum login — tidak perlu buat apa-apa
    if (!session?.token) return;

    let cancelled = false;
    const token = session.token;

    async function syncPhoto() {
      try {
        const freshUri = await downloadProfilePhoto(token);
        if (cancelled || !freshUri) return;

        // Kemaskini session dengan URI gambar terkini
        // Guna sessionRef supaya data lain dalam session tidak hilang
        setSession({ ...sessionRef.current!, photoUrl: freshUri });
      } catch {
        // Gagal download — biarkan sahaja (gambar lama / inisial kekal)
      }
    }

    // Jalankan terus masa login
    syncPhoto();

    // Jalankan setiap kali app kembali ke foreground
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') syncPhoto();
    });

    // Cleanup — batalkan jika token bertukar (logout/login semula)
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [session?.token]); // Re-run bila token bertukar (login event)
}
