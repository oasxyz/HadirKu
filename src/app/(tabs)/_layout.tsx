import { Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { gradientStyle } from '@/components/screen-background';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Tiap tab opak (punya gradien sendiri) supaya tab yang tidak aktif tidak tembus terlihat.
        sceneStyle: gradientStyle,
      }}>
      <Tabs.Screen name="jadwal" />
      <Tabs.Screen name="rekap/index" />
      <Tabs.Screen name="catatan" />
      <Tabs.Screen name="izin" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
