import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, User } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PILL_BG = '#D1E3FF';
const ACTIVE_BLUE = '#1F7BFF';
const INACTIVE = '#0F172A';
const ICON_SIZE = 22;

const TAB_LABELS: Record<string, string> = {
  index: 'Papan Pemuka Rondaan',
  profile: 'Senarai Pelawat Aktif',
};

export function MainTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter(
    (route) => route.name === 'index' || route.name === 'profile'
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 10),
        justifyContent: 'space-around',
        alignItems: 'center',
      }}
    >
      {visibleRoutes.map((route) => {
        const originalIndex = state.routes.indexOf(route);
        const isFocused = state.index === originalIndex;
        const label = TAB_LABELS[route.name] ?? route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={label}
            onPress={onPress}
            onLongPress={onLongPress}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isFocused ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: PILL_BG,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  gap: 8,
                  maxWidth: '100%',
                }}
              >
                {route.name === 'index' ? (
                  <Home color={ACTIVE_BLUE} size={ICON_SIZE} />
                ) : (
                  <User color={ACTIVE_BLUE} size={ICON_SIZE} />
                )}
                <Text
                  numberOfLines={1}
                  style={{
                    color: ACTIVE_BLUE,
                    fontWeight: '700',
                    fontSize: 11,
                    flexShrink: 1,
                  }}
                >
                  {label}
                </Text>
              </View>
            ) : route.name === 'index' ? (
              <Home color={INACTIVE} size={ICON_SIZE} />
            ) : (
              <User color={INACTIVE} size={ICON_SIZE} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
