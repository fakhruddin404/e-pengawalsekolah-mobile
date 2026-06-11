import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Easing, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MainTabBar } from '../../components/MainTabBar';
import { DashboardHeader } from '../../components/DashboardHeader';
import { useAuth } from '../../context/AuthContext';

export default function TabsLayout() {
  const router = useRouter();
  const { session } = useAuth();

  useEffect(() => {
    if (!session) {
      router.replace('/login');
    }
  }, [router, session]);

  // Prevent rendering tab screens when logged out (avoids swipe/back to cached tabs).
  if (!session) return null;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <MainTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          animation: 'fade',
          transitionSpec: {
            animation: 'timing',
            config: {
              duration: 300,
              easing: Easing.inOut(Easing.ease),
            },
          },
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
        <Tabs.Screen
          name="createLaporan"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Persistent header — absolutely overlaid on top of all tab screens.
          Renders once, never remounts on tab switch. Notification badge stays
          consistent because this component is never destroyed. */}
      <SafeAreaView
        edges={['top']}
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#ffffff' }}
      >
        <DashboardHeader />
      </SafeAreaView>
    </View>
  );
}

