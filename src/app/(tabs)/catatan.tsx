import { FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import { formatTanggal } from '@/utils/format';

export default function CatatanScreen() {
  const { state } = useAppContext();
  const currentUserId = state.currentUserId;

  const myAttendances = state.attendances.filter(
    (a) => a.userId === currentUserId
  );

  const records = myAttendances.map((att) => {
    const session = state.sessions.find((s) => s.id === att.sessionId);
    return {
      id: att.id,
      praktikum: session?.praktikum ?? '-',
      kelasLab: session?.kelasLab ?? '-',
      tanggal: session?.tanggal ?? '-',
      waktuPresensi: att.waktuPresensi,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Catatan Kehadiran</Text>

        {records.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <EmptyState message="Anda belum memiliki catatan kehadiran praktikum" />
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: Spacing.six }}
            renderItem={({ item }) => {
              const waktu = new Date(item.waktuPresensi);
              const jam = waktu.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{item.praktikum}</Text>
                  <Text style={styles.cardSubtitle}>{item.kelasLab}</Text>
                  <View style={styles.divider} />
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Tanggal</Text>
                    <Text style={styles.cardValue}>
                      {item.tanggal !== '-' ? formatTanggal(item.tanggal) : '-'}
                    </Text>
                  </View>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Waktu Presensi</Text>
                    <Text style={styles.cardValue}>{jam}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}
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
    marginBottom: Spacing.three,
  },
  emptyWrapper: {
    flex: 1,
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginBottom: Spacing.two,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
    marginBottom: Spacing.two,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 13,
    color: Palette.textMuted,
  },
  cardValue: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
});