import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, User } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './AppText';
import { textVariants } from '../theme/typography';
import { palette, radii, shadows, spacing } from '../theme/ui';

const PILL_BG = '#E8F3FF';
const ACTIVE_BLUE = palette.primary;
const INACTIVE = '#7B90A7';
const ICON_SIZE = 22;
const TAB_TRANSITION_MS = 300;
const SLIDING_PILL_HEIGHT = 36;
const SLIDING_PILL_MIN_WIDTH = 114;
const SLIDING_PILL_MAX_WIDTH = 190;
const TAB_ROW_HEIGHT = 44;
const SHELL_HORIZONTAL_PADDING = spacing.md;

const TAB_LABELS: Record<string, string> = {
  sesiRondaan: 'Rondaan',
  senaraiPelawat: 'Pelawat',
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
  const contentWidth = Math.max(0, containerWidth - SHELL_HORIZONTAL_PADDING * 2);
  const tabWidth = contentWidth > 0 ? contentWidth / visibleTabCount : 0;
  const pillWidth = Math.min(
    SLIDING_PILL_MAX_WIDTH,
    Math.max(SLIDING_PILL_MIN_WIDTH, tabWidth - spacing.sm)
  );

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
    <View style={[styles.outerWrap, { paddingBottom: safeBottomInset }]}>
      <View
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        style={[styles.shell, { paddingTop: tabRowTop }]}
      >
        {tabWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.slidingPill,
              {
                top: tabRowTop + (TAB_ROW_HEIGHT - SLIDING_PILL_HEIGHT) / 2,
                width: pillWidth,
                transform: [{ translateX: indicatorX }],
              },
            ]}
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
  const focusedProgress = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(focusedProgress, {
      toValue: isFocused ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [focusedProgress, isFocused]);

  const scaleX = squish.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.84],
  });
  const scaleY = squish.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.16],
  });
  const labelOpacity = focusedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 1],
  });
  const labelSlide = focusedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0],
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
      style={styles.tabPressable}
    >
      {isFocused ? (
        <View style={styles.focusedInner}>
          <Animated.View style={{ transform: [{ scaleX }, { scaleY }] }}>{icon}</Animated.View>
          <Animated.View style={{ opacity: labelOpacity, transform: [{ translateX: labelSlide }] }}>
            <AppText numberOfLines={1} style={styles.focusedLabel}>
              {label}
            </AppText>
          </Animated.View>
        </View>
      ) : (
        <View style={styles.inactiveInner}>
          <Animated.View style={{ transform: [{ scaleX }, { scaleY }] }}>{icon}</Animated.View>
          <View style={styles.inactiveDot} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    backgroundColor: 'transparent',
  },
  shell: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    paddingHorizontal: SHELL_HORIZONTAL_PADDING,
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#D8E8F8',
    ...shadows.floating,
  },
  slidingPill: {
    position: 'absolute',
    left: SHELL_HORIZONTAL_PADDING,
    height: SLIDING_PILL_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: PILL_BG,
    borderWidth: 1,
    borderColor: '#CAE2FF',
  },
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_ROW_HEIGHT,
  },
  focusedInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8,
    maxWidth: '100%',
  },
  focusedLabel: {
    ...textVariants.caption,
    color: ACTIVE_BLUE,
    fontWeight: '800',
    flexShrink: 1,
  },
  inactiveInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 36,
  },
  inactiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#B5C5D6',
  },
});
