import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  LABEL_STATUS_KEHADIRAN,
  StatusKehadiranBadge,
  WARNA_ANGKA_STATUS,
} from '@/components/status-kehadiran-badge';
import { IlustrasiKosong, IlustrasiPapanKlip } from '@/components/ilustrasi';
import {
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
import { formatTanggal, tanggalValid } from '@/utils/format';
import { hitungStatusKehadiran, ringkasKehadiran } from '@/utils/status-kehadiran';

/** Satu kalimat di bawah judul ringkasan, mis. "9 dari 10 sesi selesai kamu hadiri". */
function keteranganRingkasan(s: ReturnType<typeof ringkasKehadiran>): string {
  const selesai = s.hadir + s.sakit + s.izin + s.alpha;
  if (selesai === 0) return 'Belum ada sesi yang selesai.';
  return `${s.hadir} dari ${selesai} sesi selesai kamu hadiri`;
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
        <GlassCard style={styles.emptyCard}>
          <IlustrasiKosong lebar={110} />
          <Text style={styles.emptyText}>Kamu belum terdaftar di sesi praktikum manapun.</Text>
        </GlassCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title="Catatan Kehadiran" />

      {/* Ringkasan 4 status, warna sama dengan kotak ringkasan di Rekap */}
      <GlassCard style={[styles.summaryCard, styles.summaryGradien]}>
        <View style={styles.summaryTop}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.summaryTitle}>Ringkasan Kehadiran</Text>
            <Text style={styles.summarySub}>{keteranganRingkasan(summary)}</Text>
          </View>
          <IlustrasiPapanKlip lebar={88} />
        </View>
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
  // Gradasi lilac tipis, sama dengan kartu sesi di Beranda dan Detail Sesi.
  summaryGradien: {
    experimental_backgroundImage:
      'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(244, 207, 239, 0.8) 100%)',
  } as object,
  summaryTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginRight: -6,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.text,
  },
  summarySub: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyText: { color: Palette.textMuted, fontSize: 13, textAlign: 'center' },
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
