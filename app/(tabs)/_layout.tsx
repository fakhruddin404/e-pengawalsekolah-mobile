import { Tabs } from 'expo-router';
import { Home, User } from 'lucide-react-native';
import { Platform, View } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#1F7BFF',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          height: Platform.select({ ios: 88, android: 76, default: 76 }),
          paddingTop: 10,
          paddingBottom: Platform.select({ ios: 28, android: 14, default: 14 }),
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          position: 'absolute',
          overflow: 'hidden',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Papan Pemuka Rondaan',
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                width: focused ? 44 : 36,
                height: focused ? 32 : 28,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? 'rgba(31, 123, 255, 0.16)' : 'transparent',
              }}
            >
              <Home color={color} size={size} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '',
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

