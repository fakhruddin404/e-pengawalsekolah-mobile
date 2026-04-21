import { Tabs } from 'expo-router';

import { MainTabBar } from '../../components/MainTabBar';

export default function TabsLayout() {
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
    </Tabs>
  );
}
