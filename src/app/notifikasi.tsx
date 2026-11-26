// SRS4-04 (PIC B — Annis). Placeholder halaman daftar notifikasi penuh.
// Dibuka dari tombol "Lihat semua" di tab Profil (yang hanya menampilkan 3 notif terbaru).
import { View } from 'react-native';

import { EmptyNote, Screen, TopBar } from '@/components/ui';

export default function NotifikasiScreen() {
  return (
    <Screen header={<TopBar title="Notifikasi" back fallback="/profil" />}>
      <View>
        <EmptyNote
          icon="notifications-outline"
          message="Halaman daftar notifikasi lengkap belum diisi. Target SRS4-04: list seluruh notifikasi + swipe delete + deep link ke sesi/tagihan/pengajuan kelas."
        />
      </View>
    </Screen>
  );
}
