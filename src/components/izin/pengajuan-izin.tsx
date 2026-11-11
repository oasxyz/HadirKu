import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Palette, Spacing } from '@/constants/theme';

// SRS006 (pengajuan dan status izin) dan SRS007 (klasifikasi AI) — PIC C.
export function PengajuanIzin() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pengajuan Izin</Text>
      <EmptyState message="SRS006/SRS007 — Pengajuan izin praktikan (PIC C)." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.background,
    flex: 1,
    padding: Spacing.four,
  },
  title: {
    color: Palette.text,
    fontSize: 22,
    fontStyle: 'italic',
    fontWeight: '800',
  },
});
