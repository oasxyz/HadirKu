import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { Gradient } from '@/constants/theme';

// Gradien dibuat tanpa library: native memakai experimental_backgroundImage, web memakai backgroundImage.
export const gradientStyle = (
  Platform.OS === 'web' ? { backgroundImage: Gradient } : { experimental_backgroundImage: Gradient }
) as ViewStyle;

export function ScreenBackground() {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, gradientStyle]} />;
}
