import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';

import { MainTabBar } from '../../components/MainTabBar';
import { useAuth } from '../../context/AuthContext';
import { startLocationPing } from '../../services';

export default function TabsLayout() {
  const router = useRouter();
  const { session } = useAuth();

  useEffect(() => {
    if (!session) {
      router.replace('/login');
    }
  }, [router, session]);

  useEffect(() => {
    if (!session?.token) return;
    const stop = startLocationPing(session.token, {
      distanceIntervalM: 5,
      endpointPath: 'location-ping',
    });
    return stop;
  }, [session?.token]);

  // Prevent rendering tab screens when logged out (avoids swipe/back to cached tabs).
  if (!session) return null;

  return (
    <Tabs
      tabBar={(props) => <MainTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="sesiRondaan"
        options={{
          title: 'Papan Pemuka Rondaan',
        }}
      />
      <Tabs.Screen
        name="senaraiPelawat"
        options={{
          title: 'Senarai Pelawat',
        }}
      />
      <Tabs.Screen
        name="MapsDashboard"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="createPasLawatan"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
