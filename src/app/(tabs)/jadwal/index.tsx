import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import type { Session } from '@/types';
import { formatRentangJam, formatTanggal } from '@/utils/format';

export default function JadwalScreen() {
  const { state } = useAppContext();
  const currentUser = state.users.find((user) => user.id === state.currentUserId);
  const isAsisten = currentUser?.role === 'asisten';

  const sessions = state.sessions
    .filter((session) =>
      isAsisten
        ? session.asistenId === currentUser?.id
        : session.pesertaIds.includes(currentUser?.id ?? ''),
    )
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Jadwal Praktikum</Text>

        {sessions.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <EmptyState
              message={
                isAsisten
                  ? 'Kamu belum menjadi asisten di sesi manapun.'
                  : 'Kamu belum terdaftar di sesi praktikum manapun.'
              }
            />
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <SessionCard session={item} />}
          />
        )}
      </View>
    </View>
  );
}

function SessionCard({ session }: { session: Session }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/jadwal/[id]', params: { id: session.id } })}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{session.praktikum}</Text>
        <StatusBadge status={session.status} />
      </View>

      <View style={styles.row}>
        <Ionicons name="location-outline" size={14} color={Palette.textSecondary} />
        <Text style={styles.rowText}>{session.kelasLab}</Text>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={14} color={Palette.textSecondary} />
          <Text style={styles.rowText}>{formatTanggal(session.tanggal)}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="time-outline" size={14} color={Palette.textSecondary} />
          <Text style={styles.rowText}>{formatRentangJam(session.jamMulai, session.jamSelesai)}</Text>
        </View>
      </View>
    </Pressable>
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
  list: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  card: {
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardTitle: {
    flex: 1,
    color: Palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowText: {
    color: Palette.textSecondary,
    fontSize: 12,
  },
});
