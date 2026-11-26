import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { ScreenBackground } from '@/components/screen-background';
import { SplashHadirKu } from '@/components/splash-hadirku';
import { ToastProvider } from '@/components/toast';
import { AuthProvider } from '@/context/auth-context';
import { seedInitialLabsIfNeeded } from '@/services/firebase';
import { FONT_INTER, pasangFontInter } from '@/constants/font-inter';

SplashScreen.preventAutoHideAsync();
// Semua Text/TextInput memakai font Inter (lihat src/constants/font-inter.tsx).
pasangFontInter();

// Tema navigasi transparan: kalau tidak, React Navigation menutup gradien dengan latar abu-abu bawaannya.
const transparentTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent', card: 'transparent' },
};

export default function RootLayout() {
  // Splash tetap tampil sampai ikon dan font Inter selesai dimuat.
  const [fontsLoaded] = useFonts({ ...Ionicons.font, ...FONT_INTER });

  useEffect(() => {
    // Sprint 3: Pastikan 4 laboratorium default (Gedung AP, Lab B, Lab C, Lab D) terisi di Firestore
    seedInitialLabsIfNeeded();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      {/* Splash bergerak (kalender) menyambung dari splash bawaan HP. */}
      <SplashHadirKu />
      {/* Toast melayang di atas semua layar (lihat src/components/toast.tsx). */}
      <ToastProvider>
      <View style={{ flex: 1 }}>
        <ScreenBackground />
        <ThemeProvider value={transparentTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: 'transparent' },
            }}>
            {/* ===== PM — layar awal dan navigasi tab ===== */}
            <Stack.Screen name="index" />
            <Stack.Screen name="perkenalan" />
            <Stack.Screen name="(tabs)" />

            {/* ===== PIC A (Yoas) — Autentikasi, CRUD sesi full-screen, & Kelola Lab ===== */}
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="lengkapi-profil" />
            <Stack.Screen name="jadwal/form" />
            <Stack.Screen name="kelola-lab" />

            {/* ===== PIC B (Annis) — Detail rekap kehadiran ===== */}
            <Stack.Screen name="rekap/[id]" />

            {/* ===== PIC C (Varissa) — Halaman khusus presensi berbasis lokasi ===== */}
            <Stack.Screen name="presensi/[sessionId]" />

            {/* ===== Sprint 4 (PM — stub placeholder) ===== */}
            {/* PIC A Yoas (SRS4-01): bulk import CSV & distribusi praktikan oleh aslab */}
            <Stack.Screen name="bulk-import" />
            <Stack.Screen name="distribusi-praktikan" />
            {/* PIC B Annis (SRS4-04): daftar notifikasi penuh dengan swipe delete */}
            <Stack.Screen name="notifikasi" />
            {/* PIC C Yustinus (SRS4-08): detail tagihan + bayar Midtrans & riwayat pembayaran */}
            <Stack.Screen name="tagihan/[fineId]" />
            <Stack.Screen name="pembayaran" />
          </Stack>
        </ThemeProvider>
      </View>
      </ToastProvider>
    </AuthProvider>
  );
}