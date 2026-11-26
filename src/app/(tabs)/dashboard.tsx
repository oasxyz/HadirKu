// SRS4-03 (PIC B — Annis). Placeholder dibuat oleh PM supaya rute tab ini sudah
// terdaftar dan FloatingTabBar tidak error saat aslab login.
import { View } from 'react-native';

import { EmptyNote, Screen, TopBar } from '@/components/ui';

export default function DashboardAslabScreen() {
  return (
    <Screen header={<TopBar title="Dashboard" />}>
      <View>
        <EmptyNote
          icon="grid-outline"
          message="Dashboard Aslab belum diisi. Isi halaman ini pada SRS4-03 (statistik lab, grafik denda Hari/Minggu/Bulan, riwayat kegiatan & pembayaran)."
        />
      </View>
    </Screen>
  );
}
