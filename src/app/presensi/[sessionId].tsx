import { useLocalSearchParams } from 'expo-router';
import { EmptyNote, Screen, TopBar } from '@/components/ui';

export default function PresensiScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  return (
    <Screen withTabBar={false}>
      <TopBar title="Presensi Praktikum" back />
      <EmptyNote
        icon="qr-code-outline"
        message={`Halaman Presensi Sesi ${sessionId ?? ''} (SRS3-05 — PIC C)`}
      />
    </Screen>
  );
}