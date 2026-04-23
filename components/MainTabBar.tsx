import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, User } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './AppText';
import { textVariants } from '../theme/typography';
import { palette, radii, shadows, spacing } from '../theme/ui';

const PILL_BG = '#E8F1FF';
const ACTIVE_BLUE = palette.primary;
const INACTIVE = palette.text;
const ICON_SIZE = 22;

const TAB_LABELS: Record<string, string> = {
  sesiRondaan: 'Papan Pemuka Rondaan',
  senaraiPelawat: 'Senarai Pelawat',
};

export function MainTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter(
    (route) => route.name === 'sesiRondaan' || route.name === 'senaraiPelawat'
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: palette.surface,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: Math.max(insets.bottom, spacing.sm),
        justifyContent: 'space-around',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: palette.border,
        ...shadows.floating,
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
                  borderRadius: radii.pill,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  gap: 8,
                  maxWidth: '100%',
                }}
              >
                {route.name === 'sesiRondaan' ? (
                  <Home color={ACTIVE_BLUE} size={ICON_SIZE} />
                ) : (
                  <User color={ACTIVE_BLUE} size={ICON_SIZE} />
                )}
                <AppText
                  numberOfLines={1}
                  style={{
                    ...textVariants.caption,
                    color: ACTIVE_BLUE,
                    fontWeight: '800',
                    flexShrink: 1,
                  }}
                >
                  {label}
                </AppText>
              </View>
            ) : route.name === 'sesiRondaan' ? (
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
