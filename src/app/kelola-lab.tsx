import { EmptyNote, Screen, TopBar } from '@/components/ui';

export default function KelolaLabScreen() {
  return (
    <Screen withTabBar={false}>
      <TopBar title="Kelola Lokasi Laboratorium" back />
      <EmptyNote icon="location-outline" message="Halaman Kelola Laboratorium (SRS3-01 — PIC A)" />
    </Screen>
  );
}