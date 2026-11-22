// SRS3-04 (PIC B — Annis): detail rekap per sesi dengan 4 status (Hadir, Sakit, Izin, Alpha).
// Data realtime dari Firestore: sesi, presensi, dan pengajuan izin.
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import {
  LABEL_STATUS_KEHADIRAN,
  StatusKehadiranBadge,
  WARNA_ANGKA_STATUS,
} from '@/components/status-kehadiran-badge';
import { Badge, Chip, EmptyNote, GlassCard, Screen, SectionTitle, TopBar } from '@/components/ui';
import { BATAS_JARAK_METER } from '@/constants/lokasi';
import { Palette } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { useLeaveRequests } from '@/hooks/use-leave-requests';
import { useSessions } from '@/hooks/use-sessions';
import { usePraktikanList } from '@/hooks/use-users';
import type { Attendance, FinalAttendanceStatus } from '@/types';
import { formatRentangJam, formatTanggal } from '@/utils/format';
import { hitungStatusKehadiran, ringkasKehadiran, sesiSelesai } from '@/utils/status-kehadiran';

// Status sesi bisa berubah hanya karena waktu (lewat jamSelesai + toleransi), jadi layar
// dihitung ulang berkala walaupun tidak ada perubahan di Firestore.
const INTERVAL_JAM_MS = 30_000;

const URUTAN_STATUS: Record<FinalAttendanceStatus, number> = {
  hadir: 0,
  sakit: 1,
  izin: 2,
  alpha: 3,
  belum_hadir: 3,
};

function useSekarang(): Date {
  const [sekarang, setSekarang] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setSekarang(new Date()), INTERVAL_JAM_MS);
    return () => clearInterval(timer);
  }, []);
  return sekarang;
}

function formatJam(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export default function RekapDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useCurrentUser();
  const sekarang = useSekarang();
  const { sessions, attendances, loading: sessionsLoading, error } = useSessions();
  const { leaveRequests, loading: izinLoading, error: izinError } = useLeaveRequests();
  const { praktikanList, loading: usersLoading } = usePraktikanList();
  const [filter, setFilter] = useState<FinalAttendanceStatus | null>(null);

  useEffect(() => {
    if (!currentUser) {
      router.replace('/login' as Href);
    }
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  if (sessionsLoading || usersLoading || izinLoading) {
    return (
      <Screen
        withTabBar={false}
        header={<TopBar title="Rekap" back fallback="/rekap" />}>
        <GlassCard style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={styles.loadingText}>Memuat...</Text>
        </GlassCard>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen
        withTabBar={false}
        header={<TopBar title="Rekap" back fallback="/rekap" />}>
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
      <Screen
        withTabBar={false}
        header={<TopBar title="Rekap" back fallback="/rekap" />}>
        <EmptyNote message="Sesi tidak ditemukan." />
      </Screen>
    );
  }

  const selesai = sesiSelesai(session, sekarang);

  // Untuk yang belum hadir atau Alpha: tunjukkan izin yang belum diterima supaya asisten
  // tahu alasannya tanpa membuka tab Izin. Data Sprint 2 bisa punya beberapa dokumen, ambil terbaru.
  function keteranganIzin(userId: string, status: FinalAttendanceStatus): string | null {
    if (status !== 'belum_hadir' && status !== 'alpha') return null;
    const terbaru = leaveRequests
      .filter((item) => item.sessionId === session!.id && item.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!terbaru) return null;
    if (terbaru.status === 'menunggu') return 'Izin menunggu';
    if (terbaru.status === 'ditolak') return 'Izin ditolak';
    return null;
  }

  const peserta = session.pesertaIds
    .map((userId) => {
      const user = praktikanList.find((item) => item.id === userId);
      const attendance = attendances.find(
        (item) => item.sessionId === session.id && item.userId === userId,
      );
      const status = hitungStatusKehadiran(session, userId, attendances, leaveRequests, sekarang);
      return { userId, user, attendance, status, keteranganIzin: keteranganIzin(userId, status) };
    })
    .sort((a, b) => {
      const byStatus = URUTAN_STATUS[a.status] - URUTAN_STATUS[b.status];
      if (byStatus !== 0) return byStatus;
      // Yang hadir diurutkan dari presensi paling awal, sisanya menurut nama.
      if (a.attendance && b.attendance) {
        return a.attendance.waktuPresensi.localeCompare(b.attendance.waktuPresensi);
      }
      return (a.user?.nama ?? '').localeCompare(b.user?.nama ?? '');
    });

  const ringkasan = ringkasKehadiran(peserta.map((item) => item.status));
  const total = session.pesertaIds.length;

  // Kotak keempat: Belum Hadir selama sesi berjalan, Alpha setelah sesi selesai.
  const kotakRingkasan: FinalAttendanceStatus[] = [
    'hadir',
    'sakit',
    'izin',
    selesai ? 'alpha' : 'belum_hadir',
  ];
  // Filter Belum Hadir otomatis menjadi Alpha (dan sebaliknya) saat sesi berganti status.
  const filterAktif: FinalAttendanceStatus | null =
    filter === 'belum_hadir' && selesai
      ? 'alpha'
      : filter === 'alpha' && !selesai
        ? 'belum_hadir'
        : filter;
  const pesertaTampil = filterAktif
    ? peserta.filter((item) => item.status === filterAktif)
    : peserta;

  return (
    <Screen
      withTabBar={false}
      header={<TopBar title="Rekap" back fallback="/rekap" />}>
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
            {ringkasan.hadir} / {total}
          </Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        {kotakRingkasan.map((status) => (
          <SummaryBox
            key={status}
            label={LABEL_STATUS_KEHADIRAN[status]}
            value={ringkasan[status]}
            color={WARNA_ANGKA_STATUS[status]}
            selected={filterAktif === status}
            onPress={() => setFilter(filterAktif === status ? null : status)}
          />
        ))}
      </View>

      {izinError ? (
        <Text style={styles.warningText}>
          Data izin gagal dimuat, jadi Sakit dan Izin belum terhitung. Coba buka ulang layar ini.
        </Text>
      ) : null}

      <GlassCard style={styles.listCard}>
        <SectionTitle
          title={filterAktif ? `Peserta ${LABEL_STATUS_KEHADIRAN[filterAktif]}` : 'Daftar Peserta'}
          right={
            filterAktif ? (
              <Pressable onPress={() => setFilter(null)} hitSlop={8} accessibilityRole="button">
                <Text style={styles.resetText}>Tampilkan semua</Text>
              </Pressable>
            ) : undefined
          }
        />
        {peserta.length === 0 ? (
          <Text style={styles.empty}>Sesi ini belum memiliki peserta.</Text>
        ) : pesertaTampil.length === 0 && filterAktif ? (
          <Text style={styles.empty}>
            Tidak ada peserta berstatus {LABEL_STATUS_KEHADIRAN[filterAktif]}.
          </Text>
        ) : (
          pesertaTampil.map(({ userId, user, attendance, status, keteranganIzin: izin }) => (
            <View key={userId} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowName}>{user?.nama ?? 'Praktikan tidak dikenal'}</Text>
                <Text style={styles.rowNim}>
                  {attendance ? `${user?.nim ?? ''} · ${keteranganPresensi(attendance)}` : user?.nim ?? ''}
                </Text>
                {izin ? <Text style={styles.rowNote}>{izin}</Text> : null}
                {attendance && diLuarRadius(attendance) ? (
                  <View style={styles.badgeWrapper}>
                    <Badge label="Di luar radius" tone="dark" />
                  </View>
                ) : null}
              </View>
              <StatusKehadiranBadge status={status} />
            </View>
          ))
        )}
      </GlassCard>
    </Screen>
  );
}

function keteranganPresensi(attendance: Attendance): string {
  const jam = formatJam(attendance.waktuPresensi);
  const jarak = attendance.jarakMeter;
  return jarak === undefined || jarak === null ? jam : `${jam} · ${Math.round(jarak)} m`;
}

// Presensi Sprint 3 menyimpan radius lab saat presensi; data Sprint 2 memakai batas lama.
function diLuarRadius(attendance: Attendance): boolean {
  const jarak = attendance.jarakMeter;
  if (jarak === undefined || jarak === null) return false;
  return jarak > (attendance.radiusSaatPresensi ?? BATAS_JARAK_METER);
}

function SummaryBox({
  label,
  value,
  color,
  selected,
  onPress,
}: {
  label: string;
  value: number;
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} ${value} orang, ketuk untuk menyaring daftar`}
      style={({ pressed }) => [
        styles.summaryBox,
        selected && styles.summaryBoxSelected,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.summaryValue, { color: selected ? '#FFFFFF' : color }]}>{value}</Text>
      <Text style={[styles.summaryLabel, selected && styles.summaryLabelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: {
    color: Palette.textSecondary,
    fontSize: 14,
  },
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
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryBox: {
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 14,
  },
  summaryBoxSelected: {
    backgroundColor: Palette.ink,
    borderColor: Palette.ink,
  },
  summaryLabelSelected: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.75,
  },
  resetText: {
    color: Palette.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    color: Palette.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  warningText: {
    color: Palette.textSecondary,
    fontSize: 12,
    lineHeight: 17,
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
    paddingRight: 12,
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
  rowNote: {
    color: Palette.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  badgeWrapper: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
});
