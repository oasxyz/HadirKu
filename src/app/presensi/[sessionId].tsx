import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AttendanceAction } from '@/components/attendance-action';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  IlustrasiDitutup,
  IlustrasiHadir,
  IlustrasiIzinDiterima,
  IlustrasiKosong,
  IlustrasiLab,
  IlustrasiMenunggu,
} from '@/components/ilustrasi';
import { LocationCheckCard } from '@/components/location-check-card';
import { StatusBadge } from '@/components/status-badge';
import { DeviceStatusCard, EmptyNote, GlassCard, Screen, TopBar } from '@/components/ui';
import { Palette, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { useLeaveRequests } from '@/hooks/use-leave-requests';
import { useLocationValidation } from '@/hooks/useLocationValidation';
import { useSessions } from '@/hooks/use-sessions';
import { formatRentangJam, formatTanggalSingkat } from '@/utils/format';
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
        {/* Kartu sesi bergaya sama dengan Detail Sesi: status, judul, chip bertumpuk, ilustrasi. */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionText}>
            <StatusBadge status={session.status} />
            <Text style={styles.sessionTitle} numberOfLines={2}>
              {session.praktikum}
            </Text>
            <Text style={styles.sessionMeta}>Asisten: {asistenName}</Text>
            <View style={styles.sessionChips}>
              <View style={styles.chip}>
                <Text style={[styles.chipText, styles.chipTebal]}>
                  {formatRentangJam(session.jamMulai, session.jamSelesai)}
                </Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{formatTanggalSingkat(session.tanggal)}</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {locationState.labName ?? session.kelasLab}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.sessionArt}>
            <IlustrasiLab lebar={110} />
          </View>
        </View>

        {/* ========== 2. KARTU GUARD SESI (status sesi / sudah hadir / sudah izin) ========== */}
        {!isPeserta && (
          <DeviceStatusCard
            title="Bukan Peserta Sesi"
            message="Anda tidak terdaftar sebagai peserta di sesi praktikum ini."
            tone="danger"
            icon="person-remove-outline"
            ilustrasi={<IlustrasiKosong lebar={110} />}
          />
        )}

        {isPeserta && isTutup && (
          <DeviceStatusCard
            title="Sesi Sudah Ditutup"
            message="Presensi sesi ini sudah ditutup. Hubungi asisten jika Anda perlu mengajukan izin."
            tone="danger"
            icon="lock-closed-outline"
            ilustrasi={<IlustrasiDitutup lebar={120} />}
          />
        )}

        {isPeserta && !isTutup && session.status === 'belum_dibuka' && (
          <DeviceStatusCard
            title="Sesi Belum Dibuka"
            message="Asisten belum membuka sesi presensi. Silakan tunggu sampai sesi dibuka."
            tone="warning"
            icon="hourglass-outline"
            ilustrasi={<IlustrasiMenunggu lebar={120} />}
          />
        )}

        {isPeserta && sudahHadir && (
          <GlassCard style={styles.successCard}>
            <IlustrasiHadir lebar={130} />
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
            ilustrasi={izinAktif.status === 'diterima' ? <IlustrasiIzinDiterima lebar={120} /> : <IlustrasiMenunggu lebar={120} />}
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
            <IlustrasiHadir lebar={140} />
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
  sessionCard: {
    alignItems: 'flex-end',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    borderWidth: 1,
    experimental_backgroundImage:
      'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(244, 207, 239, 0.8) 100%)',
    flexDirection: 'row',
    gap: 4,
    padding: 18,
  } as object,
  sessionText: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 8,
  },
  sessionArt: {
    alignSelf: 'center',
  },
  sessionTitle: {
    color: Palette.text,
    fontSize: 20,
    fontWeight: '600',
  },
  sessionMeta: {
    color: Palette.textSecondary,
    fontSize: 13,
  },
  sessionChips: {
    alignItems: 'flex-start',
    gap: 6,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: Palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: Palette.text,
    fontSize: 12,
    fontWeight: '500',
  },
  chipTebal: {
    fontWeight: '700',
  },

  successCard: {
    alignItems: 'center',
    backgroundColor: '#F7F6FB',
    borderColor: Palette.border,
    gap: 6,
    paddingVertical: Spacing.four,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.text,
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
    backgroundColor: Palette.ink,
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