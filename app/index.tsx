import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const SPLASH_DURATION_MS = 2500;
const FLOAT_DURATION_MS = 3400;

type PositionPercent = `${number}%`;

type ShapeConfig = {
  top?: PositionPercent;
  right?: PositionPercent;
  bottom?: PositionPercent;
  left?: PositionPercent;
  size: number;
  color: string;
  xOffset: number;
  yOffset: number;
};

const SHAPES: ShapeConfig[] = [
  {
    top: '14%',
    left: '8%',
    size: 52,
    color: 'rgba(64, 156, 255, 0.16)',
    xOffset: 16,
    yOffset: -18,
  },
  {
    top: '20%',
    right: '9%',
    size: 88,
    color: 'rgba(18, 118, 231, 0.13)',
    xOffset: -14,
    yOffset: 22,
  },
  {
    bottom: '26%',
    left: '12%',
    size: 72,
    color: 'rgba(84, 183, 255, 0.15)',
    xOffset: 13,
    yOffset: -12,
  },
  {
    bottom: '14%',
    right: '10%',
    size: 60,
    color: 'rgba(90, 198, 255, 0.14)',
    xOffset: -10,
    yOffset: 16,
  },
];

export default function Index() {
  const router = useRouter();
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.84)).current;
  const ringOpacity = useRef(new Animated.Value(0.34)).current;

  useEffect(() => {
    const floatAnimation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: FLOAT_DURATION_MS,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    );
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const ringAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.08,
            duration: 1750,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.08,
            duration: 1750,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 0.84,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.34,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    floatAnimation.start();
    pulseAnimation.start();
    ringAnimation.start();

    const timer = setTimeout(() => {
      router.replace('/login');
    }, SPLASH_DURATION_MS);

    return () => {
      clearTimeout(timer);
      floatAnimation.stop();
      pulseAnimation.stop();
      ringAnimation.stop();
    };
  }, [progress, pulse, ringScale, ringOpacity, router]);

  const logoLift = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -14, 0],
  });

  const logoScale = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.03, 1],
  });

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.backgroundGlowPrimary} />
      <View style={styles.backgroundGlowSecondary} />

      {SHAPES.map((shape, index) => {
        const animationProgress = progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 1, 0],
        });
        const offsetX = animationProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, shape.xOffset],
        });
        const offsetY = animationProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, shape.yOffset],
        });

        return (
          <Animated.View
            // Decorative moving circles to make splash feel alive.
            key={`shape-${index}`}
            style={[
              styles.shape,
              {
                width: shape.size,
                height: shape.size,
                borderRadius: shape.size / 2,
                backgroundColor: shape.color,
                top: shape.top,
                right: shape.right,
                bottom: shape.bottom,
                left: shape.left,
                transform: [
                  { translateX: offsetX },
                  { translateY: offsetY },
                ],
                opacity: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 1],
                }),
              },
            ]}
          />
        );
      })}

      <View style={styles.centerWrapper}>
        <Animated.View
          style={[
            styles.pulseRing,
            { transform: [{ scale: ringScale }], opacity: ringOpacity },
          ]}
        />
        <Animated.View
          style={[
            styles.logoWrapper,
            { transform: [{ translateY: logoLift }, { scale: logoScale }] },
          ]}
        >
          <Image
            source={require('../assets/images/splash.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#eef6ff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  backgroundGlowPrimary: {
    position: 'absolute',
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: 'rgba(106, 176, 255, 0.26)',
    top: -180,
    right: -100,
  },
  backgroundGlowSecondary: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(120, 193, 255, 0.23)',
    bottom: -150,
    left: -120,
  },
  centerWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 3,
    borderColor: 'rgba(67, 149, 235, 0.38)',
    backgroundColor: 'rgba(145, 203, 255, 0.24)',
  },
  logoWrapper: {
    width: 360,
    height: 360,
    borderRadius: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(99, 173, 244, 0.38)',
  },
  logo: {
    width: 320,
    height: 320,
  },
  shape: {
    position: 'absolute',
  },
});
