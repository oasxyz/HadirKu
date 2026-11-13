import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ScreenBackground } from '@/components/screen-background';
import { AppProvider } from '@/context/app-context';
import { AuthProvider } from '@/context/auth-context';

SplashScreen.preventAutoHideAsync();

// Tema navigasi transparan: kalau tidak, React Navigation menutup gradien dengan latar abu-abu bawaannya.
const transparentTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent', card: 'transparent' },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

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
              {/* ===== RS001/SRS002/SRS009 — Autentikasi, CRUD data praktikum, rules (PIC A — Yoas) ===== */}
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
              <Stack.Screen name="jadwal-form" />
              <Stack.Screen name="lengkapi-profil" />
              {/* ===== SRS003/SRS005/SRS008 — Sesi realtime, rekap, pemeriksaan izin (PIC B — Yustinus) ===== */}
              <Stack.Screen name="rekap/[id]" />
              {/* ===== SRS004/SRS005/SRS006/SRS007 — Presensi, catatan, izin, AI (PIC C — Varissa) ===== */}
            </Stack>
          </ThemeProvider>
        </View>
      </AppProvider>
    </AuthProvider>
  );
}
