import { EmptyNote, Screen, TopBar } from '@/components/ui';

// SRS008 (pemeriksaan izin oleh asisten) — PIC B.
export function PemeriksaanIzin() {
  return (
    <Screen>
      <TopBar title="Pemeriksaan Izin" />
      <EmptyNote message="SRS008 — Pemeriksaan izin oleh asisten (PIC B)." />
    </Screen>
  );
}
