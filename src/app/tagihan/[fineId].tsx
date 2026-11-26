// SRS4-08 (PIC C — Yustinus). Placeholder halaman detail tagihan denda + tombol Bayar Sekarang.
// Routing dinamis: /tagihan/{fineId}. Dibuka dari notifikasi tagihan_baru dan dari halaman pembayaran.
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { EmptyNote, FormScreen, TopBar } from '@/components/ui';

export default function DetailTagihanScreen() {
  const { fineId } = useLocalSearchParams<{ fineId: string }>();
  return (
    <FormScreen header={<TopBar title="Detail Tagihan" back fallback="/pembayaran" />}>
      <View>
        <EmptyNote
          icon="receipt-outline"
          message={`Halaman detail tagihan belum diisi (id=${fineId ?? '-'}). Target SRS4-08: tampilkan info sesi/denda + tombol Bayar Sekarang (createMidtransTransaction + WebBrowser.openAuthSessionAsync).`}
        />
      </View>
    </FormScreen>
  );
}
