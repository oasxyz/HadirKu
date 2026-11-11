import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppProvider } from '@/context/app-context';
import { Palette } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppProvider>
      <StatusBar style="light" />
      <AnimatedSplashOverlay />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Palette.background },
        }}>
        {/* ===== PM — layar awal dan navigasi tab ===== */}
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />

        {/* ===== SRS001/SRS002/SRS009 — Autentikasi, CRUD data praktikum, rules (PIC A — Yoas) ===== */}
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />

        {/* ===== SRS003/SRS005/SRS008 — Sesi realtime, rekap, pemeriksaan izin (PIC B — Yustinus) ===== */}
        <Stack.Screen name="rekap/[id]" />

        {/* ===== SRS004/SRS005/SRS006/SRS007 — Presensi, catatan, izin, AI (PIC C — Varissa) ===== */}
      </Stack>
    </AppProvider>
  );
}
