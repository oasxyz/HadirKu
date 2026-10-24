import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';

export default function JadwalScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Jadwal Praktikum</Text>
        <View style={styles.emptyWrapper}>
          <EmptyState message="Daftar jadwal & detail sesi menyusul di fitur F2." />
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
