import { EmptyNote, Screen, TopBar } from '@/components/ui';

// SRS006 (pengajuan dan status izin) dan SRS007 (klasifikasi AI) — PIC C.
export function PengajuanIzin() {
  return (
    <Screen>
      <TopBar title="Pengajuan Izin" />
      <EmptyNote message="SRS006/SRS007 — Pengajuan izin praktikan (PIC C)." />
    </Screen>
  );
}
