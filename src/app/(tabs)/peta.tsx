import { EmptyNote, Screen, TopBar } from '@/components/ui';

export default function PetaScreen() {
  return (
    <Screen>
      <TopBar title="Peta Laboratorium" />
      <EmptyNote icon="map-outline" message="Halaman Peta Laboratorium (SRS3-03 — PIC B)" />
    </Screen>
  );
}