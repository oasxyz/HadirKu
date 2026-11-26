// SRS4-01 (PIC A — Yoas). Placeholder distribusi praktikan antar kelas (top-down oleh aslab).
import { View } from 'react-native';

import { EmptyNote, Screen, TopBar } from '@/components/ui';

export default function DistribusiPraktikanScreen() {
  return (
    <Screen header={<TopBar title="Distribusi Praktikan" back />}>
      <View>
        <EmptyNote
          icon="people-outline"
          message="Halaman Distribusi Praktikan belum diisi. Target SRS4-01: aslab memindah praktikan antar kelas (A1..E2) secara top-down, memicu notifikasi kelas_dipindah_aslab."
        />
      </View>
    </Screen>
  );
}
