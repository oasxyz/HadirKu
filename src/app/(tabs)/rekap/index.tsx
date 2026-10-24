import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import type { Session } from '@/types';
import { formatRentangJam, formatTanggal } from '@/utils/format';

export default function RekapScreen() {
  const { state } = useAppContext();
  const currentUser = state.users.find((user) => user.id === state.currentUserId);
  const sessions = state.sessions
    .filter((session) => session.asistenId === currentUser?.id)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Rekap Kehadiran</Text>
        {sessions.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <EmptyState message="Belum ada sesi praktikum untuk direkap." />
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <RecapCard session={item} />}
          />
        )}
      </View>
    </View>
  );
}

function RecapCard({ session }: { session: Session }) {
  const { state } = useAppContext();
  const hadir = state.attendances.filter((item) => item.sessionId === session.id).length;

  return (
    <Pressable
      onPress={() => router.push(`/rekap/${session.id}` as Href)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{session.praktikum}</Text>
        <StatusBadge status={session.status} />
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={15} color={Palette.textSecondary} />
        <Text style={styles.infoText}>{session.kelasLab}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={15} color={Palette.textSecondary} />
        <Text style={styles.infoText}>
          {formatTanggal(session.tanggal)} · {formatRentangJam(session.jamMulai, session.jamSelesai)}
        </Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryIcon}>
          <Ionicons name="people-outline" size={18} color={Palette.primary} />
        </View>
        <View>
          <Text style={styles.summaryValue}>
            {hadir} / {session.pesertaIds.length}
          </Text>
          <Text style={styles.summaryLabel}>Praktikan hadir</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Palette.textMuted} />
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
    borderColor: Palette.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: Palette.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  infoText: {
    color: Palette.textSecondary,
    fontSize: 12,
  },
  summary: {
    alignItems: 'center',
    borderColor: Palette.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: Palette.primaryMuted,
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  summaryValue: {
    color: Palette.text,
    fontSize: 16,
    fontWeight: '800',
  },
  summaryLabel: {
    color: Palette.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
