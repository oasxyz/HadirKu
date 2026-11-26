// SRS4-01 (PIC A — Yoas). Placeholder bulk import CSV untuk aslab.
// Route sudah terdaftar di src/app/_layout.tsx supaya menu Kelola Lab bisa menautkannya.
import { View } from 'react-native';

import { EmptyNote, FormScreen, TopBar } from '@/components/ui';

export default function BulkImportScreen() {
  return (
    <FormScreen header={<TopBar title="Bulk Import" back />}>
      <View>
        <EmptyNote
          icon="cloud-upload-outline"
          message="Halaman Bulk Insert CSV belum diisi. Target SRS4-01: parsing CSV (papaparse), scroll view accept/reject/edit per baris untuk 3 jenis (lab, praktikan, asprak)."
        />
      </View>
    </FormScreen>
  );
}
