import { StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';
import type { SessionStatus } from '@/types';

const LABELS: Record<SessionStatus, string> = {
  belum_dibuka: 'Belum Dibuka',
  dibuka: 'Sedang Dibuka',
  ditutup: 'Ditutup',
};

// Kotak status berteks putih, seragam dengan kartu sesi di Beranda dan Detail Sesi.
const WARNA: Record<SessionStatus, string> = {
  belum_dibuka: Palette.textMuted,
  dibuka: Palette.primary,
  ditutup: Palette.ink,
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <View style={[styles.kotak, { backgroundColor: WARNA[status] }]}>
      <Text style={styles.teks}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kotak: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  teks: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
