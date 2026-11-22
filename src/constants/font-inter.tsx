/* eslint-disable @typescript-eslint/no-require-imports */
// Font Inter untuk seluruh aplikasi, supaya tampilan sama di semua HP (tanpa ini, teks memakai
// font bawaan HP: Samsung, Xiaomi, dll. berbeda-beda) dan mendekati mockup.
//
// React Native tidak punya pengaturan font global, jadi `Text` dan `TextInput` dari
// 'react-native' diganti versi yang otomatis memakai Inter. Layar lain tidak perlu diubah.
// - fontWeight dipetakan ke berkas Inter yang sesuai (Android tidak memilih berkas tebal
//   sendiri untuk font kustom), lalu fontWeight di-reset ke 'normal'.
// - Teks yang sudah punya fontFamily sendiri (mis. ikon Ionicons) tidak diubah.
//
// Dipasang sekali di src/app/_layout.tsx: `pasangFontInter()` di tingkat modul, dan
// `FONT_INTER` dimuat lewat useFonts.
import type { ComponentProps, ComponentType } from 'react';
import { StyleSheet, type TextStyle } from 'react-native';

export const FONT_INTER = {
  Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  Inter_800ExtraBold: require('@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf'),
};

function keluargaInter(weight: TextStyle['fontWeight']): string {
  switch (String(weight ?? '400')) {
    case '500':
      return 'Inter_500Medium';
    case '600':
      return 'Inter_600SemiBold';
    case '700':
    case 'bold':
      return 'Inter_700Bold';
    case '800':
    case '900':
      return 'Inter_800ExtraBold';
    default:
      return 'Inter_400Regular';
  }
}

// Modul utama react-native mengekspor `Text` dan `TextInput` sebagai getter yang masih bisa
// diganti (berkas di dalam Libraries/ terkunci).
const modulRN = require('react-native');

function denganInter<P extends { style?: unknown }>(Asli: ComponentType<P>): ComponentType<P> {
  function KomponenInter(props: P) {
    const gaya = (StyleSheet.flatten(props.style as TextStyle) ?? {}) as TextStyle;
    if (gaya.fontFamily) return <Asli {...props} />;
    return (
      <Asli
        {...props}
        style={[props.style as TextStyle, { fontFamily: keluargaInter(gaya.fontWeight), fontWeight: 'normal' }]}
      />
    );
  }
  KomponenInter.displayName = Asli.displayName ?? 'Text';
  return KomponenInter;
}

type TextProps = ComponentProps<typeof modulRN.Text>;
type TextInputProps = ComponentProps<typeof modulRN.TextInput>;

const TextInter = denganInter<TextProps>(modulRN.Text);
const TextInputInter = denganInter<TextInputProps>(modulRN.TextInput);

function ganti(nama: 'Text' | 'TextInput', pengganti: unknown) {
  if (modulRN[nama] === pengganti) return;
  Object.defineProperty(modulRN, nama, { configurable: true, enumerable: true, get: () => pengganti });
}

/** Tidak pernah melempar error: kalau gagal, aplikasi tetap jalan dengan font bawaan HP. */
export function pasangFontInter() {
  try {
    ganti('Text', TextInter);
    ganti('TextInput', TextInputInter);
  } catch (error) {
    console.warn('[UI][pasangFontInter] Font Inter gagal dipasang:', error);
  }
}
