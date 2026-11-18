import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ScreenBackground } from '@/components/screen-background';
import { AppProvider } from '@/context/app-context';
import { AuthProvider } from '@/context/auth-context';
import { seedInitialLabsIfNeeded } from '@/services/firebase';

SplashScreen.preventAutoHideAsync();

// Tema navigasi transparan: kalau tidak, React Navigation menutup gradien dengan latar abu-abu bawaannya.
const transparentTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent', card: 'transparent' },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  useEffect(() => {
    // Sprint 3: Pastikan 4 laboratorium default (Gedung AP, Lab B, Lab C, Lab D) terisi di Firestore
    seedInitialLabsIfNeeded();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <AnimatedSplashOverlay />
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
              <Stack.Screen name="(tabs)" />

              {/* ===== PIC A (Yoas) — Autentikasi, CRUD sesi full-screen, & Kelola Lab ===== */}
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
              <Stack.Screen name="lengkapi-profil" />
              <Stack.Screen name="jadwal-form" />
              <Stack.Screen name="kelola-lab" />

              {/* ===== PIC B (Annis) — Detail rekap kehadiran ===== */}
              <Stack.Screen name="rekap/[id]" />

              {/* ===== PIC C (Varissa) — Halaman khusus presensi berbasis lokasi ===== */}
              <Stack.Screen name="presensi/[sessionId]" />
            </Stack>
          </ThemeProvider>
        </View>
      </AppProvider>
    </AuthProvider>
  );
}