/**
 * Tema dan token warna HadirKu Sprint 3.
 * Menggunakan palet Pastel Glassmorphism dengan warna semantik yang diperjelas.
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
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});

export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const Palette = {
  background: 'transparent',
  card: 'rgba(255, 255, 255, 0.78)',
  cardMuted: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(110, 90, 150, 0.16)',
  
  // Status: Aktif / Berhasil / Hadir / Di Dalam Radius
  primary: '#E21BD0',
  primaryMuted: 'rgba(222, 31, 203, 0.12)',
  
  // Teks & Label Netral
  text: '#131118',
  textSecondary: '#5E586C',
  textMuted: '#8F89A0',
  
  // Status: Selesai / Berat / Ditutup
  ink: '#17151C',
  
  // Status: Izin / Kategori Izin
  info: '#6D28D9',
  infoMuted: 'rgba(109, 40, 217, 0.12)',
  
  // Status: Menunggu / Sakit / GPS Mati / Sedang Memeriksa
  warning: '#D97706',
  warningMuted: 'rgba(217, 119, 6, 0.14)',
  
  // Status: Alpha / Ditolak / Di Luar Radius / Error Form
  danger: '#E11D48',
  dangerMuted: 'rgba(225, 29, 72, 0.12)',
  
  lavender: '#E4DAF1',
  lilac: '#F4CFEF',
  success: '#E21BD0',
} as const;

export const Gradient = 'linear-gradient(165deg, #EEF0F5 0%, #E7E2EE 55%, #E2CEE6 100%)';

export const Glass = {
  card: {
    backgroundColor: Palette.card,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 22,
    borderWidth: 1,
    boxShadow: '0 8px 24px rgba(110, 70, 160, 0.10)',
  },
} as const;