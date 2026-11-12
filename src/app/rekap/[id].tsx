import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import {
  Chip,
  EmptyNote,
  GlassCard,
  IconCircle,
  RoundButton,
  Screen,
  SectionTitle,
  TopBar,
  tints,
} from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import { formatRentangJam, formatTanggal } from '@/utils/format';

const BAR_HEIGHT = 150;

export default function RekapDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useAppContext();
  const session = state.sessions.find((item) => item.id === id);

  if (!session) {
    return (
      <Screen withTabBar={false}>
        <TopBar title="Rekap" back fallback="/rekap" />
        <EmptyNote message="Sesi tidak ditemukan." />
      </Screen>
    );
  }

  const attendees = state.attendances
    .filter((item) => item.sessionId === session.id)
    .map((item) => ({ item, user: state.users.find((user) => user.id === item.userId) }));
  const total = session.pesertaIds.length;
  const hadir = attendees.length;
  const belum = Math.max(total - hadir, 0);
  const barHeight = (count: number) =>
    total === 0 ? 28 : Math.max(28, (count / total) * BAR_HEIGHT);

  return (
    <Screen withTabBar={false}>
      <TopBar title="Rekap" back fallback="/rekap" right={<RoundButton icon="ellipsis-horizontal" />} />

      <View style={styles.titleBlock}>
        <Text style={styles.title}>{session.praktikum}</Text>
        <View style={styles.chips}>
          <Chip icon="calendar-outline" label={formatTanggal(session.tanggal)} />
          <Chip icon="time-outline" label={formatRentangJam(session.jamMulai, session.jamSelesai)} />
          <StatusBadge status={session.status} />
        </View>
      </View>

      <View style={styles.stat}>
        <View style={styles.statIcon}>
          <Ionicons name="flash" size={20} color={Palette.text} />
        </View>
        <View>
          <Text style={styles.statLabel}>Praktikan Hadir</Text>
          <Text style={styles.statValue}>
            {hadir} / {total}
          </Text>
        </View>
      </View>

      <View style={styles.bars}>
        <Bar label="Hadir" value={hadir} height={barHeight(hadir)} tint={2} icon="checkmark-done-outline" />
        <Bar label="Belum hadir" value={belum} height={barHeight(belum)} tint={3} icon="hourglass-outline" />
      </View>

      <GlassCard style={styles.listCard}>
        <SectionTitle title="Daftar Kehadiran" />
        {attendees.length === 0 ? (
          <Text style={styles.empty}>Belum ada praktikan yang melakukan presensi.</Text>
        ) : (
          attendees.map(({ item, user }, index) => (
            <View key={item.id} style={styles.row}>
              <IconCircle icon="person-outline" tint={index} size={44} />
              <View style={styles.rowText}>
                <Text style={styles.rowName}>{user?.nama ?? '-'}</Text>
                <Text style={styles.rowNim}>{user?.nim ?? ''}</Text>
              </View>
              <Chip
                icon="time-outline"
                label={new Date(item.waktuPresensi).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })}
              />
            </View>
          ))
        )}
      </GlassCard>
    </Screen>
  );
}

function Bar({
  label,
  value,
  height,
  tint,
  icon,
}: {
  label: string;
  value: number;
  height: number;
  tint: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.barColumn}>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { height, backgroundColor: tints[tint].bg }]} />
        <View style={styles.barIcon}>
          <Ionicons name={icon} size={16} color={tints[tint].fg} />
        </View>
      </View>
      <Text style={styles.barLabel}>{label}</Text>
      <Text style={styles.barValue}>{value} orang</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    gap: 10,
  },
  title: {
    color: Palette.text,
    fontSize: 26,
    fontWeight: '600',
    lineHeight: 32,
  },
  chips: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stat: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  statIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 999,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  statLabel: {
    color: Palette.textSecondary,
    fontSize: 12,
  },
  statValue: {
    color: Palette.text,
    fontSize: 20,
    fontWeight: '700',
  },
  bars: {
    flexDirection: 'row',
    gap: 14,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  barTrack: {
    alignItems: 'center',
    height: BAR_HEIGHT + 20,
    justifyContent: 'flex-end',
    width: '100%',
  },
  barFill: {
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 26,
    borderWidth: 1,
    width: '100%',
  },
  barIcon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    bottom: -4,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    width: 36,
  },
  barLabel: {
    color: Palette.textSecondary,
    fontSize: 12,
    marginTop: 6,
  },
  barValue: {
    color: Palette.text,
    fontSize: 18,
    fontWeight: '600',
  },
  listCard: {
    gap: 12,
  },
  empty: {
    color: Palette.textMuted,
    fontSize: 13,
    paddingVertical: 8,
  },
  row: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 10,
    padding: 6,
    paddingRight: 8,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    color: Palette.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rowNim: {
    color: Palette.textMuted,
    fontSize: 11,
  },
});
