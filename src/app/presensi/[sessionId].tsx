import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AttendanceAction } from '@/components/attendance-action';
import { ErrorBoundary } from '@/components/error-boundary';
import { LocationCheckCard } from '@/components/location-check-card';
import { StatusBadge } from '@/components/status-badge';
import {
  Chip,
  DeviceStatusCard,
  EmptyNote,
  GlassCard,
  Illustration,
  Screen,
  TopBar,
} from '@/components/ui';
import { Palette, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { useLeaveRequests } from '@/hooks/use-leave-requests';
import { useLocationValidation } from '@/hooks/useLocationValidation';
import { useSessions } from '@/hooks/use-sessions';
import { formatRentangJam, formatTanggal } from '@/utils/format';
import { sesiSudahBerakhir } from '@/utils/sesi';

export default function PresensiScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const currentUser = useCurrentUser();
  const { sessions, attendances } = useSessions();
  const { leaveRequests } = useLeaveRequests();

  const [showSuccess, setShowSuccess] = useState(false);

  const session = sessions.find((s) => s.id === sessionId);

  // Hook lokasi — selalu dipanggil (hooks tidak boleh kondisional).
  // labId pakai fallback 'lab-b' kalau sesi lama belum punya field.
  const locationState = useLocationValidation(session?.labId);

  // Guard: sesi tidak ditemukan
  if (!session) {
    return (
      <Screen
        withTabBar={false}
        header={<TopBar title="Presensi Praktikum" back fallback="/jadwal" />}>
        <EmptyNote
          icon="alert-circle-outline"
          message="Sesi praktikum tidak ditemukan atau Anda tidak terdaftar sebagai peserta."
        />
      </Screen>
    );
  }

  const currentUserId = currentUser?.id ?? '';

  // Status sesi
  const sesiBerakhir = sesiSudahBerakhir(session);
  const isDibuka = session.status === 'dibuka' && !sesiBerakhir;
  const isTutup = session.status === 'ditutup' || sesiBerakhir;

  // Status kehadiran praktikan di sesi ini
  const existingAttendance = attendances.find(
    (a) => a.sessionId === session.id && a.userId === currentUserId,
  );
  const sudahHadir = existingAttendance !== undefined;

  // Izin aktif (menunggu atau diterima)
  const izinAktif = leaveRequests.find(
    (lr) =>
      lr.sessionId === session.id &&
      lr.userId === currentUserId &&
      (lr.status === 'menunggu' || lr.status === 'diterima'),
  );

  // Peserta?
  const isPeserta = session.pesertaIds.includes(currentUserId);

  // Status global: boleh presensi?
  const sessionBlocked = isTutup || sudahHadir || izinAktif !== undefined || !isPeserta;

  const locked = sessionBlocked || !locationState.canAttend;

  const asistenName = session.asistenNama || 'Asisten Lab';

  const openAppSettings = () => Linking.openSettings();

  return (
    <Screen
      withTabBar={false}
      header={<TopBar title="Presensi Praktikum" back fallback="/jadwal" />}>
      <ErrorBoundary fallbackTitle="Halaman Presensi Bermasalah">
        {/* ========== 1. KARTU INFORMASI SESI ========== */}
        <GlassCard style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.sessionTitle}>{session.praktikum}</Text>
              <Text style={styles.sessionMeta}>Asisten: {asistenName}</Text>
            </View>
            <StatusBadge status={session.status} />
          </View>

          <View style={styles.sessionChips}>
            <Chip label={formatTanggal(session.tanggal)} icon="calendar-outline" />
            <Chip
              label={formatRentangJam(session.jamMulai, session.jamSelesai)}
              icon="time-outline"
            />
            <Chip
              label={locationState.labName ?? session.kelasLab}
              icon="location-outline"
            />
          </View>
        </GlassCard>

        {/* ========== 2. KARTU GUARD SESI (status sesi / sudah hadir / sudah izin) ========== */}
        {!isPeserta && (
          <DeviceStatusCard
            title="Bukan Peserta Sesi"
            message="Anda tidak terdaftar sebagai peserta di sesi praktikum ini."
            tone="danger"
            icon="person-remove-outline"
          />
        )}

        {isPeserta && isTutup && (
          <DeviceStatusCard
            title="Sesi Sudah Ditutup"
            message="Presensi sesi ini sudah ditutup. Hubungi asisten jika Anda perlu mengajukan izin."
            tone="danger"
            icon="lock-closed-outline"
          />
        )}

        {isPeserta && !isTutup && session.status === 'belum_dibuka' && (
          <DeviceStatusCard
            title="Sesi Belum Dibuka"
            message="Asisten belum membuka sesi presensi. Silakan tunggu sampai sesi dibuka."
            tone="warning"
            icon="hourglass-outline"
          />
        )}

        {isPeserta && sudahHadir && (
          <GlassCard style={styles.successCard}>
            <Illustration icon="checkmark-circle" />
            <Text style={styles.successTitle}>Sudah Hadir</Text>
            <Text style={styles.successSubtitle}>
              Tercatat pada{' '}
              {existingAttendance?.waktuPresensi
                ? new Date(existingAttendance.waktuPresensi).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-'}
            </Text>
          </GlassCard>
        )}

        {isPeserta && !sudahHadir && izinAktif && (
          <DeviceStatusCard
            title={izinAktif.status === 'diterima' ? 'Izin Diterima' : 'Pengajuan Izin Sedang Diproses'}
            message={
              izinAktif.status === 'diterima'
                ? 'Anda sudah memiliki pengajuan izin yang diterima untuk sesi ini. Presensi tidak diperlukan.'
                : 'Pengajuan izin Anda sedang menunggu konfirmasi asisten. Fitur presensi untuk sesi ini terkunci.'
            }
            tone="warning"
            icon="document-text-outline"
          />
        )}

        {/* ========== 3. KARTU PEMERIKSAAN LOKASI ========== */}
        {isPeserta && isDibuka && !sudahHadir && !izinAktif && (
          <LocationCheckCard state={locationState} onOpenSettings={openAppSettings} />
        )}

        {/* ========== 4. KARTU AKSI PRESENSI ========== */}
        {isPeserta && isDibuka && !sudahHadir && !izinAktif && (
          <AttendanceAction
            sessionId={session.id}
            session={session}
            jarakMeter={locationState.jarakMeter}
            radiusMeter={locationState.labRadiusMeter}
            locked={locked}
            onSuccess={() => setShowSuccess(true)}
          />
        )}
      </ErrorBoundary>

      {/* ========== MODAL SUKSES ========== */}
      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccess(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Illustration icon="checkmark" />
            <Text style={styles.modalTitle}>Presensi Berhasil!</Text>
            <Text style={styles.modalSubtitle}>
              Kehadiran Anda telah tercatat.
            </Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => {
                setShowSuccess(false);
                router.back();
              }}>
              <Text style={styles.modalButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sessionCard: { gap: Spacing.two },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  sessionTitle: {
    color: Palette.text,
    fontSize: 20,
    fontWeight: '700',
  },
  sessionMeta: {
    color: Palette.textSecondary,
    fontSize: 13,
  },
  sessionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  successCard: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.four,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.primary,
  },
  successSubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 20, 50, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Palette.primary,
    padding: Spacing.four,
    width: '80%',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: Palette.primary,
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 999,
    marginTop: 6,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});