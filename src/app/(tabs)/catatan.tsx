import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';

export default function CatatanScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Catatan Kehadiran</Text>
        <View style={styles.emptyWrapper}>
          <EmptyState message="Riwayat presensi pribadi dikerjakan di fitur F6 (Varissa)." />
        </View>
      </View>
    </View>
  );
}

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
