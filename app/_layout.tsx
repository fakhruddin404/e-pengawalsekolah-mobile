import '../global.css';

import { useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { Stack } from 'expo-router';

import { AuthProvider, useAuth, usePhotoSync } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { startLocationPing } from '../services';
import { PELAWAT_AKTIF_SYNC_EVENT, subscribeToPelawatAktifUpdates } from '../services/realtimeService';
import { useAutoLogoutOnAppClear } from '../services/logout';
import { AUTH_EXPIRED_EVENT } from '../services/apiClient';
import { useRouter } from 'expo-router';

function SessionPasLawatanRealtime() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.token) return;

    return subscribeToPelawatAktifUpdates(session.token, () => {
      DeviceEventEmitter.emit(PELAWAT_AKTIF_SYNC_EVENT);
    });
  }, [session?.token]);

  return null;
}

function SessionLocationTracker() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.token) return;

    const stop = startLocationPing(session.token, {
      // Send first ping immediately, then rely on movement threshold.
      distanceIntervalM: 5,
      minTimeBetweenSendsMs: 10_000,
      endpointPath: 'location-ping',
    });

    return stop;
  }, [session?.token]);

  return null;
}

function SessionAppCloseHandler() {
  useAutoLogoutOnAppClear();
  return null;
}

// ─────────────────────────────────────────────────────────────
// Dengar event AUTH_EXPIRED_EVENT dari Axios 401 interceptor.
// Bila token dipadam di server (pengawal login pada peranti lain),
// paksa logout dan redirect ke skrin login.
// ─────────────────────────────────────────────────────────────
function SessionExpiredHandler() {
  const { session, setSession } = useAuth();
  const router = useRouter();
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(AUTH_EXPIRED_EVENT, () => {
      // Hanya bertindak kalau masih dalam sesi aktif
      if (!sessionRef.current?.token) return;
      setSession(null);
      router.replace('/login');
    });
    return () => sub.remove();
  }, [setSession, router]);

  return null;
}

function PhotoSyncHandler() {
  usePhotoSync();
  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <SessionLocationTracker />
        <SessionPasLawatanRealtime />
        <SessionAppCloseHandler />
        <PhotoSyncHandler />
        <SessionExpiredHandler />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="password-manager" />
        </Stack>
      </NotificationProvider>
    </AuthProvider>
  );
}

