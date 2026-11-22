import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  EmptyNote,
  GlassCard,
  Screen,
  SectionTitle,
  TopBar,
} from '@/components/ui';
import { Palette, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { useLeaveRequests } from '@/hooks/use-leave-requests';
import { useSessions } from '@/hooks/use-sessions';
import type { FinalAttendanceStatus } from '@/types';
import { formatTanggal } from '@/utils/format';
import { hitungStatusKehadiran, ringkasKehadiran } from '@/utils/status-kehadiran';

// Peta label + warna untuk 4 status + belum hadir
const STATUS_META: Record<
  FinalAttendanceStatus,
  { label: string; color: string; bg: string; icon: 'checkmark-circle' | 'medkit' | 'document-text' | 'close-circle' | 'time' }
> = {
  hadir: { label: 'Hadir', color: Palette.primary, bg: 'rgba(226,27,208,0.1)', icon: 'checkmark-circle' },
  sakit: { label: 'Sakit', color: '#D97706', bg: 'rgba(217,119,6,0.14)', icon: 'medkit' },
  izin: { label: 'Izin', color: '#6D28D9', bg: 'rgba(109,40,217,0.12)', icon: 'document-text' },
  alpha: { label: 'Alpha', color: '#E11D48', bg: 'rgba(225,29,72,0.12)', icon: 'close-circle' },
  belum_hadir: { label: 'Belum Hadir', color: Palette.textSecondary, bg: 'rgba(110,90,150,0.08)', icon: 'time' },
};

export default function CatatanScreen() {
  const currentUser = useCurrentUser();
  const { sessions, attendances, loading: sessLoading } = useSessions();
  const { leaveRequests, loading: lrLoading } = useLeaveRequests();

  const loading = sessLoading || lrLoading;
  const currentUserId = currentUser?.id ?? '';

  if (loading) {
    return (
      <Screen>
        <TopBar title="Catatan Kehadiran" />
        <GlassCard style={styles.loaderCard}>
          <ActivityIndicator size="large" color={Palette.primary} />
        </GlassCard>
      </Screen>
    );
  }

  // Ambil semua sesi di mana praktikan adalah peserta, urut terbaru dulu.
  // Status akhir dihitung memakai helper dari PIC Rekap biar konsisten
  // antara halaman Rekap (asisten) dan Catatan (praktikan).
  const myRows = sessions
    .filter((s) => s.pesertaIds.includes(currentUserId))
    .map((s) => ({
      session: s,
      status: hitungStatusKehadiran(s, currentUserId, attendances, leaveRequests),
    }))
    .sort((a, b) => (a.session.tanggal < b.session.tanggal ? 1 : -1));

  const summary = ringkasKehadiran(myRows.map((row) => row.status));

  if (myRows.length === 0) {
    return (
      <Screen>
        <TopBar title="Catatan Kehadiran" />
        <EmptyNote message="Kamu belum terdaftar di sesi praktikum manapun." />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title="Catatan Kehadiran" />

      {/* === RINGKASAN 4 STATUS === */}
      <GlassCard style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Ringkasan Kehadiran</Text>
        <View style={styles.summaryGrid}>
          <SummaryCell status="hadir" count={summary.hadir} />
          <SummaryCell status="sakit" count={summary.sakit} />
          <SummaryCell status="izin" count={summary.izin} />
          <SummaryCell status="alpha" count={summary.alpha} />
        </View>
        {summary.belum_hadir > 0 && (
          <Text style={styles.belumHint}>
            {summary.belum_hadir} sesi masih berjalan atau belum ditutup
          </Text>
        )}
      </GlassCard>

      <SectionTitle title="Riwayat Sesi" />

      <View style={{ gap: Spacing.two }}>
        {myRows.map(({ session, status }) => (
          <SessionRow key={session.id} session={session} status={status} />
        ))}
      </View>
    </Screen>
  );
}

function SummaryCell({
  status,
  count,
}: {
  status: FinalAttendanceStatus;
  count: number;
}) {
  const meta = STATUS_META[status];
  return (
    <View style={styles.summaryCell}>
      <View style={[styles.summaryIconCircle, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={22} color={meta.color} />
      </View>
      <Text style={[styles.summaryCount, { color: meta.color }]}>{count}</Text>
      <Text style={styles.summaryLabel}>{meta.label}</Text>
    </View>
  );
}

function SessionRow({
  session,
  status,
}: {
  session: { praktikum: string; kelasLab: string; tanggal: string };
  status: FinalAttendanceStatus;
}) {
  const meta = STATUS_META[status];
  return (
    <GlassCard style={styles.rowCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{session.praktikum}</Text>
        <Text style={styles.rowSub}>
          {formatTanggal(session.tanggal)} · {session.kelasLab}
        </Text>
      </View>
      <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={14} color={meta.color} />
        <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  loaderCard: { padding: 24, alignItems: 'center' },

  summaryCard: { gap: Spacing.two },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.text,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCount: {
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
    color: Palette.textSecondary,
  },
  belumHint: {
    fontSize: 12,
    color: Palette.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },

  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.text,
  },
  rowSub: {
    fontSize: 12,
    color: Palette.textMuted,
    marginTop: 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
});