import { Text, type TextProps, type TextStyle } from 'react-native';

import { textVariants, type TextVariant } from '../theme/typography';

export type AppTextProps = TextProps & {
  variant?: TextVariant;
};

function toArray(style: any): TextStyle[] {
  if (!style) return [];
  return Array.isArray(style) ? style : [style];
}

export function AppText({ variant = 'body', style, ...props }: AppTextProps) {
  return <Text {...props} style={[textVariants[variant], ...toArray(style)]} />;
}

