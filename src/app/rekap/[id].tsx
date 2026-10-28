import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import { formatRentangJam, formatTanggal } from '@/utils/format';

export default function RekapDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useAppContext();
  const session = state.sessions.find((item) => item.id === id);

  if (!session) {
    return (
      <View style={styles.container}>
        <EmptyState message="Sesi tidak ditemukan." />
      </View>
    );
  }

  const attendances = state.attendances.filter((item) => item.sessionId === session.id);
  const attendees = attendances
    .map((attendance) => ({
      attendance,
      user: state.users.find((user) => user.id === attendance.userId),
    }))
    .filter((item) => item.user !== undefined);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{session.praktikum}</Text>
          <StatusBadge status={session.status} />
        </View>

        <View style={styles.metaCard}>
          <MetaRow icon="location-outline" label={session.kelasLab} />
          <MetaRow
            icon="calendar-outline"
            label={`${formatTanggal(session.tanggal)} · ${formatRentangJam(session.jamMulai, session.jamSelesai)}`}
          />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>RINGKASAN KEHADIRAN</Text>
          <Text style={styles.summaryValue}>
            {attendees.length} / {session.pesertaIds.length}
          </Text>
          <Text style={styles.summaryCaption}>Praktikan Hadir</Text>
        </View>

        <Text style={styles.sectionTitle}>Daftar Kehadiran</Text>
        {attendees.length === 0 ? (
          <View style={styles.emptyCard}>
            <EmptyState message="Belum ada praktikan yang melakukan presensi" />
          </View>
        ) : (
          <View style={styles.attendeeList}>
            {attendees.map(({ attendance, user }) => (
              <View key={attendance.id} style={styles.attendeeCard}>
                <View style={styles.avatar}>
                  <Ionicons name="person-outline" size={19} color={Palette.primary} />
                </View>
                <View style={styles.attendeeInfo}>
                  <Text style={styles.attendeeName}>{user?.nama}</Text>
                  <Text style={styles.attendeeNim}>{user?.nim}</Text>
                </View>
                <View style={styles.timeBlock}>
                  <Ionicons name="time-outline" size={15} color={Palette.success} />
                  <Text style={styles.timeText}>{formatAttendanceTime(attendance.waktuPresensi)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function formatAttendanceTime(value: string): string {
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function MetaRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={16} color={Palette.textSecondary} />
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.background,
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  inner: {
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    paddingBottom: Spacing.six,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    width: '100%',
  },
  headerRow: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  title: {
    color: Palette.text,
    fontSize: 22,
    fontStyle: 'italic',
    fontWeight: '800',
  },
  metaCard: {
    backgroundColor: Palette.card,
    borderColor: Palette.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: Spacing.two,
    marginBottom: Spacing.three,
    padding: Spacing.three,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  metaText: {
    color: Palette.textSecondary,
    fontSize: 13,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: Palette.primaryMuted,
    borderColor: 'rgba(145, 70, 255, 0.45)',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.four,
    padding: Spacing.three,
  },
  summaryLabel: {
    color: Palette.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  summaryValue: {
    color: Palette.text,
    fontSize: 34,
    fontWeight: '800',
    marginTop: Spacing.one,
  },
  summaryCaption: {
    color: Palette.textSecondary,
    fontSize: 13,
  },
  sectionTitle: {
    color: Palette.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  emptyCard: {
    backgroundColor: Palette.card,
    borderColor: Palette.border,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 160,
  },
  attendeeList: {
    gap: Spacing.two,
  },
  attendeeCard: {
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderColor: Palette.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: Palette.primaryMuted,
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    color: Palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  attendeeNim: {
    color: Palette.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  timeBlock: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  timeText: {
    color: Palette.success,
    fontSize: 12,
    fontWeight: '700',
  },
});
