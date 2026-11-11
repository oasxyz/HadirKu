import { Stack } from 'expo-router';

import { Palette } from '@/constants/theme';

export default function IzinStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Palette.background },
      }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
