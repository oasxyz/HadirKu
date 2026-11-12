/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * Palet HadirKu versi terang: gradien pastel + kartu kaca (semi-transparan) + aksen magenta.
 * Nama token sama dengan versi gelap, jadi layar yang memakai Palette ikut berubah.
 * `background` transparan karena latar gradien digambar sekali di root (ScreenBackground).
 */
export const Palette = {
  background: 'transparent',
  card: 'rgba(255, 255, 255, 0.72)',
  cardMuted: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(110, 90, 150, 0.16)',
  primary: '#E21BD0',
  primaryMuted: 'rgba(222, 31, 203, 0.12)',
  text: '#131118',
  textSecondary: '#5E586C',
  textMuted: '#8F89A0',
  success: '#16A34A',
  danger: '#E11D48',
} as const;

/** Latar gradien lavender ke pink lembut. */
export const Gradient = 'linear-gradient(165deg, #EEF0F5 0%, #E7E2EE 55%, #E2CEE6 100%)';

/** Gaya kartu kaca: putih semi-transparan, tepi tipis terang, bayangan lembut, sudut besar. */
export const Glass = {
  card: {
    backgroundColor: Palette.card,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 22,
    borderWidth: 1,
    boxShadow: '0 8px 24px rgba(110, 70, 160, 0.10)',
  },
} as const;
