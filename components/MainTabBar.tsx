import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, User } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './AppText';
import { textVariants } from '../theme/typography';
import { palette, radii, shadows, spacing } from '../theme/ui';

const PILL_BG = '#E8F1FF';
const ACTIVE_BLUE = palette.primary;
const INACTIVE = palette.text;
const ICON_SIZE = 22;
const TAB_TRANSITION_MS = 300;
const SLIDING_PILL_HEIGHT = 36;
const SLIDING_PILL_MIN_WIDTH = 102;
const TAB_ROW_HEIGHT = 44;

const TAB_LABELS: Record<string, string> = {
  sesiRondaan: 'Papan Pemuka Rondaan',
  senaraiPelawat: 'Senarai Pelawat',
};

export function MainTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const indicatorX = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const safeBottomInset =
    Platform.OS === 'ios' ? Math.max(insets.bottom * 0.6, spacing.xs) : Math.max(insets.bottom, spacing.sm);
  const tabRowTop = Platform.OS === 'ios' ? spacing.xs : spacing.sm;

  const visibleRoutes = state.routes.filter(
    (route) => route.name === 'sesiRondaan' || route.name === 'senaraiPelawat'
  );
  const visibleTabCount = visibleRoutes.length || 1;
  const focusedRouteKey = state.routes[state.index]?.key;
  const focusedVisibleIndex = Math.max(
    0,
    visibleRoutes.findIndex((route) => route.key === focusedRouteKey)
  );
  const tabWidth = containerWidth > 0 ? containerWidth / visibleTabCount : 0;
  const pillWidth = Math.max(SLIDING_PILL_MIN_WIDTH, tabWidth - spacing.sm);

  useEffect(() => {
    if (!tabWidth) return;
    const targetX = focusedVisibleIndex * tabWidth + (tabWidth - pillWidth) / 2;
    Animated.timing(indicatorX, {
      toValue: targetX,
      duration: TAB_TRANSITION_MS,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [focusedVisibleIndex, indicatorX, pillWidth, tabWidth]);

  return (
    <View
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={{
        position: 'relative',
        flexDirection: 'row',
        backgroundColor: palette.surface,
        paddingHorizontal: spacing.md,
        paddingTop: tabRowTop,
        paddingBottom: safeBottomInset,
        justifyContent: 'space-around',
        alignItems: 'flex-start',
        borderTopWidth: 1,
        borderTopColor: palette.border,
        ...shadows.floating,
      }}
    >
      {tabWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: tabRowTop + (TAB_ROW_HEIGHT - SLIDING_PILL_HEIGHT) / 2,
            left: spacing.md,
            width: pillWidth,
            height: SLIDING_PILL_HEIGHT,
            borderRadius: radii.pill,
            backgroundColor: PILL_BG,
            transform: [{ translateX: indicatorX }],
          }}
        />
      ) : null}

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
          <AnimatedTabButton
            key={route.key}
            isFocused={isFocused}
            label={label}
            routeName={route.name}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </View>
  );
}

function AnimatedTabButton({
  routeName,
  label,
  isFocused,
  onPress,
  onLongPress,
}: {
  routeName: string;
  label: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const squish = useRef(new Animated.Value(0)).current;
  const scaleX = squish.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.84],
  });
  const scaleY = squish.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.16],
  });

  const icon = useMemo(
    () =>
      routeName === 'sesiRondaan' ? (
        <Home color={isFocused ? ACTIVE_BLUE : INACTIVE} size={ICON_SIZE} />
      ) : (
        <User color={isFocused ? ACTIVE_BLUE : INACTIVE} size={ICON_SIZE} />
      ),
    [isFocused, routeName]
  );

  const animateSquish = (toValue: number) => {
    Animated.spring(squish, {
      toValue,
      useNativeDriver: true,
      damping: 7,
      stiffness: 280,
      mass: 0.55,
    }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => animateSquish(1)}
      onPressOut={() => animateSquish(0)}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: TAB_ROW_HEIGHT,
      }}
    >
      {isFocused ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: radii.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            gap: 8,
            maxWidth: '100%',
          }}
        >
          <Animated.View style={{ transform: [{ scaleX }, { scaleY }] }}>{icon}</Animated.View>
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
      ) : (
        <Animated.View style={{ transform: [{ scaleX }, { scaleY }] }}>{icon}</Animated.View>
      )}
    </Pressable>
  );
}
