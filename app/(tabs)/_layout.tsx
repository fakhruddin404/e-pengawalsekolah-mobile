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
        name="index"
        options={{
          title: 'Papan Pemuka Rondaan',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Senarai Pelawat Aktif',
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
