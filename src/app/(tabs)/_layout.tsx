import { Tabs } from 'expo-router';
import { useEffect } from 'react';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { gradientStyle } from '@/components/screen-background';
import { useCurrentUser } from '@/context/auth-context';
import { seedDummyPraktikan200IfNeeded, seedInitialLabsIfNeeded } from '@/services/firebase';

export default function TabsLayout() {
  const currentUser = useCurrentUser();

  useEffect(() => {
    // Seeder hanya berjalan jika pengguna yang login adalah asisten
    if (currentUser?.role === 'asisten') {
      seedInitialLabsIfNeeded();
      seedDummyPraktikan200IfNeeded();
    }
  }, [currentUser]);

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: gradientStyle,
      }}>
      <Tabs.Screen name="jadwal" />
      <Tabs.Screen name="peta" />
      <Tabs.Screen name="rekap/index" />
      <Tabs.Screen name="catatan" />
      <Tabs.Screen name="izin" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}