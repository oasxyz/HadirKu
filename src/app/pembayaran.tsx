// SRS4-08 (PIC C — Yustinus). Placeholder halaman riwayat pembayaran & daftar tagihan praktikan.
// Dibuka dari tab Profil praktikan.
import { View } from 'react-native';

import { EmptyNote, Screen, TopBar } from '@/components/ui';

export default function PembayaranScreen() {
  return (
    <Screen header={<TopBar title="Pembayaran" back fallback="/profil" />}>
      <View>
        <EmptyNote
          icon="card-outline"
          message="Halaman riwayat pembayaran belum diisi. Target SRS4-08: list seluruh tagihan praktikan dengan filter status (pending/paid/cancelled), buka detail tagihan dengan tap."
        />
      </View>
    </Screen>
  );
}
