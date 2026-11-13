// SRS005 rekap (PIC B — Yustinus): detail kehadiran per sesi, realtime dari Firestore.
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, type Href } from 'expo-router';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';

import { StatusBadge } from '@/components/status-badge';
import {
  Badge,
  Chip,
  EmptyNote,
  GlassCard,
  Screen,
  SectionTitle,
  TopBar,
} from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { useSessions } from '@/hooks/use-sessions';
import { usePraktikanList } from '@/hooks/use-users';
import { formatRentangJam, formatTanggal } from '@/utils/format';

const BAR_HEIGHT = 150;

export default function RekapDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useCurrentUser();
  const { sessions, attendances, loading: sessionsLoading, error } = useSessions();
  const { praktikanList, loading: usersLoading } = usePraktikanList();

  useEffect(() => {
    if (!currentUser) {
      router.replace('/login' as Href);
    }
  }, [currentUser]);

  if (!currentUser) {
    return null; 
  }

  if (sessionsLoading || usersLoading) {
    return (
      <Screen withTabBar={false}>
        <TopBar title="Rekap" back fallback="/rekap" />
        <GlassCard style={{ alignItems: 'center', padding: 24, gap: 12 }}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={{ color: Palette.textSecondary, fontSize: 14 }}>Memuat...</Text>
        </GlassCard>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen withTabBar={false}>
        <TopBar title="Rekap" back fallback="/rekap" />
        <EmptyNote 
          icon="cloud-offline-outline"
          message="Tidak ada koneksi internet. Terjadi kesalahan, coba lagi." 
        />
      </Screen>
    );
  }

  const session = sessions.find((item) => item.id === id);

  if (!session) {
    return (
      <Screen withTabBar={false}>
        <TopBar title="Rekap" back fallback="/rekap" />
        <EmptyNote message="Sesi tidak ditemukan." />
      </Screen>
    );
  }

  const attendees = attendances
    .filter((item) => item.sessionId === session.id)
    .map((item) => ({ item, user: praktikanList.find((user) => user.id === item.userId) }));
    
  const total = session.pesertaIds.length;
  const hadir = attendees.length;
  const belum = Math.max(total - hadir, 0);
  const barHeight = (count: number) =>
    total === 0 ? 28 : Math.max(28, (count / total) * BAR_HEIGHT);

  return (
    <Screen withTabBar={false}>
      <TopBar title="Rekap" back fallback="/rekap" />

      <View style={styles.titleBlock}>
        <Text style={styles.title}>{session.praktikum}</Text>
        <View style={styles.chips}>
          <Chip label={formatTanggal(session.tanggal)} />
          <Chip label={formatRentangJam(session.jamMulai, session.jamSelesai)} />
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
        <Bar label="Hadir" value={hadir} height={barHeight(hadir)} color="#EFB4EA" />
        <Bar label="Belum hadir" value={belum} height={barHeight(belum)} color="#DDD3EC" />
      </View>

      <GlassCard style={styles.listCard}>
        <SectionTitle title="Daftar Kehadiran" />
        {attendees.length === 0 ? (
          <Text style={styles.empty}>Belum ada praktikan yang melakukan presensi.</Text>
        ) : (
          attendees.map(({ item, user }) => {
            // Gunakan (any) untuk akses jarakMeter sampai PM menambahkan tipe ini ke Attendance interface.
            const jarakMeter = (item as any).jarakMeter;
            const isSuspicious = jarakMeter !== undefined && jarakMeter !== null && jarakMeter > 60;
            
            return (
              <View key={item.id} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>{user?.nama ?? '-'}</Text>
                  <Text style={styles.rowNim}>{user?.nim ?? ''}</Text>
                  {isSuspicious && (
                    <View style={styles.badgeWrapper}>
                      <Badge label={`Di luar lab · ${Math.round(jarakMeter)}m`} tone="dark" />
                    </View>
                  )}
                </View>
                <Chip
                  label={new Date(item.waktuPresensi).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                />
              </View>
            );
          })
        )}
      </GlassCard>
    </Screen>
  );
}

function Bar({
  label,
  value,
  height,
  color,
}: {
  label: string;
  value: number;
  height: number;
  color: string;
}) {
  return (
    <View style={styles.barColumn}>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { height, backgroundColor: color }]} />
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
    borderRadius: 24,
    flexDirection: 'row',
    gap: 10,
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 12,
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
  badgeWrapper: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
});