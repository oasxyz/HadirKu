import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  LABEL_STATUS_KEHADIRAN,
  StatusKehadiranBadge,
  WARNA_ANGKA_STATUS,
} from '@/components/status-kehadiran-badge';
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

// Tanggal sesi harus valid (YYYY-MM-DD dan benar-benar ada di kalender), supaya data yang
// salah ketik tidak tampil sebagai "40 Nov 2026".
function tanggalValid(tanggal: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return false;
  const [y, m, d] = tanggal.split('-').map(Number);
  const tgl = new Date(y, m - 1, d);
  return tgl.getFullYear() === y && tgl.getMonth() === m - 1 && tgl.getDate() === d;
}

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
          <Text style={styles.loaderText}>Memuat catatan kehadiran…</Text>
        </GlassCard>
      </Screen>
    );
  }

  // Ambil semua sesi di mana praktikan adalah peserta, terbaru di atas (tanggal lalu jam mulai).
  // Status akhir dihitung memakai helper yang sama dengan Rekap supaya hasilnya konsisten.
  const myRows = sessions
    .filter((s) => s.pesertaIds.includes(currentUserId) && tanggalValid(s.tanggal))
    .map((s) => ({
      session: s,
      status: hitungStatusKehadiran(s, currentUserId, attendances, leaveRequests),
    }))
    .sort(
      (a, b) =>
        b.session.tanggal.localeCompare(a.session.tanggal) ||
        b.session.jamMulai.localeCompare(a.session.jamMulai),
    );

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

      {/* Ringkasan 4 status, warna sama dengan kotak ringkasan di Rekap */}
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

function SummaryCell({ status, count }: { status: FinalAttendanceStatus; count: number }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={[styles.summaryCount, { color: WARNA_ANGKA_STATUS[status] }]}>{count}</Text>
      <Text style={styles.summaryLabel}>{LABEL_STATUS_KEHADIRAN[status]}</Text>
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
  return (
    <GlassCard style={styles.rowCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{session.praktikum}</Text>
        <Text style={styles.rowSub}>
          {formatTanggal(session.tanggal)} · {session.kelasLab}
        </Text>
      </View>
      <StatusKehadiranBadge status={status} />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  loaderCard: { padding: 24, alignItems: 'center', gap: 12 },
  loaderText: { color: Palette.textSecondary, fontSize: 14 },

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
    gap: 2,
    paddingVertical: 8,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
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
});
