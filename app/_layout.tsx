import '../global.css';

import { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { Stack } from 'expo-router';

import { AuthProvider, useAuth, usePhotoSync } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { startLocationPing } from '../services';
import { PELAWAT_AKTIF_SYNC_EVENT, subscribeToPelawatAktifUpdates } from '../services/realtimeService';
import { useAutoLogoutOnAppClear } from '../services/logout';

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

