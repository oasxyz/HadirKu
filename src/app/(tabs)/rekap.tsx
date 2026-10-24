import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';

export default function RekapScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Rekap Kehadiran</Text>
        <View style={styles.emptyWrapper}>
          <EmptyState message="Rekap kehadiran per sesi dikerjakan di fitur F5 (Yustinus)." />
        </View>
      </View>
    </View>
  );
}

// TODO (F5 - Yustinus): Sesi sekarang punya session.pesertaIds (lihat src/types/index.ts).
// "Ringkasan jumlah hadir dibanding total praktikan" harusnya dihitung dari
// session.pesertaIds.length (total praktikan terdaftar di SESI itu), bukan dari
// jumlah semua user berperan praktikan di state.users.

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  inner: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  title: {
    color: Palette.text,
    fontSize: 22,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  emptyWrapper: {
    flex: 1,
  },
});
