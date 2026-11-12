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
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
              <Stack.Screen name="rekap/[id]" />
            </Stack>
          </ThemeProvider>
        </View>
      </AppProvider>
    </AuthProvider>
  );
}
