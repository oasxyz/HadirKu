import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Palette, Spacing } from '@/constants/theme';

// SRS008 (pemeriksaan izin oleh asisten) — PIC B.
export function PemeriksaanIzin() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pemeriksaan Izin</Text>
      <EmptyState message="SRS008 — Pemeriksaan izin oleh asisten (PIC B)." />
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
