import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import AttendanceAction from '@/components/attendance-action';
import SessionControls from '@/components/session-controls';
import { StatusBadge } from '@/components/status-badge';
import {
  Avatar,
  Chip,
  EmptyNote,
  GlassCard,
  IconCircle,
  Screen,
  SectionTitle,
  TopBar,
} from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import { formatRentangJam, formatTanggal } from '@/utils/format';

export default function SesiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useAppContext();

  const session = state.sessions.find((item) => item.id === id);
  const currentUser = state.users.find((user) => user.id === state.currentUserId);

  if (!session) {
    return (
      <Screen>
        <TopBar title="Detail Sesi" back />
        <EmptyNote message="Sesi tidak ditemukan." />
      </Screen>
    );
  }

  const asisten = state.users.find((user) => user.id === session.asistenId);
  const isAsisten = currentUser?.role === 'asisten';
  const hadir = state.attendances
    .filter((item) => item.sessionId === session.id)
    .map((item) => ({ item, user: state.users.find((user) => user.id === item.userId) }));

  return (
    <Screen>
      <TopBar title="Detail Sesi" back />

      <View style={styles.person}>
        <View style={styles.personText}>
          <Text style={styles.personRole}>Asisten</Text>
          <Text style={styles.personName}>{asisten?.nama ?? '-'}</Text>
        </View>
        <Avatar nama={asisten?.nama ?? '?'} size={68} />
      </View>

      <View style={styles.hero}>
        <View style={styles.heroText}>
          <View style={styles.timePill}>
            <View style={styles.timeCheck}>
              <Ionicons name="checkmark" size={14} color={Palette.primary} />
            </View>
            <Text style={styles.timeText}>
              {formatRentangJam(session.jamMulai, session.jamSelesai)}
            </Text>
          </View>
          <Text style={styles.heroTitle}>{session.praktikum}</Text>
          <View style={styles.heroChips}>
            <Chip label={formatTanggal(session.tanggal)} icon="calendar-outline" />
            <Chip label={session.kelasLab} icon="location-outline" />
          </View>
          <StatusBadge status={session.status} />
        </View>
        <Ionicons name="flask" size={64} color="rgba(226, 27, 208, 0.35)" />
      </View>

      <SectionTitle title={isAsisten ? 'Kelola Sesi' : 'Presensi'} />
      {isAsisten ? (
        <SessionControls sessionId={session.id} />
      ) : (
        <AttendanceAction sessionId={session.id} />
      )}

      {isAsisten ? (
        <GlassCard style={styles.listCard}>
          <SectionTitle
            title="Kehadiran"
            right={
              <Text style={styles.count}>
                {hadir.length}/{session.pesertaIds.length}
              </Text>
            }
          />
          {hadir.length === 0 ? (
            <Text style={styles.empty}>Belum ada praktikan yang presensi.</Text>
          ) : (
            hadir.map(({ item, user }, index) => (
              <View key={item.id} style={styles.attendee}>
                <IconCircle icon="person-outline" tint={index} size={44} />
                <View style={styles.attendeeText}>
                  <Text style={styles.attendeeName}>{user?.nama ?? '-'}</Text>
                  <Text style={styles.attendeeNim}>{user?.nim ?? ''}</Text>
                </View>
                <Chip
                  icon="time-outline"
                  label={new Date(item.waktuPresensi).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                />
              </View>
            ))
          )}
        </GlassCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  person: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  personText: {
    flex: 1,
  },
  personRole: {
    color: Palette.textMuted,
    fontSize: 13,
  },
  personName: {
    color: Palette.text,
    fontSize: 30,
    fontWeight: '600',
    lineHeight: 36,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: 'rgba(238, 205, 228, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 18,
  },
  heroText: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 10,
  },
  timePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    padding: 5,
    paddingRight: 14,
  },
  timeCheck: {
    alignItems: 'center',
    backgroundColor: 'rgba(226, 27, 208, 0.14)',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  timeText: {
    color: Palette.text,
    fontSize: 13,
    fontWeight: '500',
  },
  heroTitle: {
    color: Palette.text,
    fontSize: 20,
    fontWeight: '600',
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  listCard: {
    gap: 12,
  },
  count: {
    color: Palette.textMuted,
    fontSize: 13,
  },
  empty: {
    color: Palette.textMuted,
    fontSize: 13,
    paddingVertical: 8,
  },
  attendee: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 10,
    padding: 6,
    paddingRight: 8,
  },
  attendeeText: {
    flex: 1,
  },
  attendeeName: {
    color: Palette.text,
    fontSize: 14,
    fontWeight: '600',
  },
  attendeeNim: {
    color: Palette.textMuted,
    fontSize: 11,
  },
});
