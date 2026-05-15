import '../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { startLocationPing } from '../services';

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

export default function RootLayout() {
  return (
    <AuthProvider>
      <SessionLocationTracker />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="password-manager" />
      </Stack>
    </AuthProvider>
  );
}

