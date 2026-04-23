import { Platform, type TextStyle } from 'react-native';

import { colors } from './colors';

export const fontSizes = {
  12: 12,
  14: 14,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
} as const;

// RN iOS/Android don't support comma-separated font stacks.
// We keep a modern system sans-serif by default and allow 'Inter' when available.
const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  web: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  default: undefined,
});

export const typography = {
  fontFamily,
  colors,
  // Headings: premium tracking
  headingLetterSpacing: -0.5,
  // Body: readable rhythm
  bodyLineHeightMultiplier: 1.5,
} as const;

function lh(size: number) {
  return Math.round(size * typography.bodyLineHeightMultiplier);
}

export const textVariants = {
  h1: {
    fontFamily,
    fontSize: fontSizes[32],
    lineHeight: Math.round(fontSizes[32] * 1.2),
    fontWeight: '800',
    letterSpacing: typography.headingLetterSpacing,
    color: colors.text,
  } satisfies TextStyle,
  h2: {
    fontFamily,
    fontSize: fontSizes[24],
    lineHeight: Math.round(fontSizes[24] * 1.2),
    fontWeight: '800',
    letterSpacing: typography.headingLetterSpacing,
    color: colors.text,
  } satisfies TextStyle,
  h3: {
    fontFamily,
    fontSize: fontSizes[20],
    lineHeight: Math.round(fontSizes[20] * 1.25),
    fontWeight: '800',
    letterSpacing: typography.headingLetterSpacing,
    color: colors.text,
  } satisfies TextStyle,
  body: {
    fontFamily,
    fontSize: fontSizes[16],
    lineHeight: lh(fontSizes[16]),
    fontWeight: '400',
    color: colors.text,
  } satisfies TextStyle,
  bodySm: {
    fontFamily,
    fontSize: fontSizes[14],
    lineHeight: lh(fontSizes[14]),
    fontWeight: '400',
    color: colors.text,
  } satisfies TextStyle,
  caption: {
    fontFamily,
    fontSize: fontSizes[12],
    lineHeight: lh(fontSizes[12]),
    fontWeight: '400',
    color: colors.muted,
  } satisfies TextStyle,
  label: {
    fontFamily,
    fontSize: fontSizes[14],
    lineHeight: lh(fontSizes[14]),
    fontWeight: '600',
    color: colors.text,
  } satisfies TextStyle,
} as const;

export type TextVariant = keyof typeof textVariants;

