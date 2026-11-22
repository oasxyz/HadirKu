import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AttendanceAction } from '@/components/attendance-action';
import { ErrorBoundary } from '@/components/error-boundary';
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
      <Screen withTabBar={false}>
        <TopBar title="Presensi Praktikum" back fallback="/jadwal" />
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

  // Izin diterima?
  const izinDiterima = leaveRequests.find(
    (lr) =>
      lr.sessionId === session.id &&
      lr.userId === currentUserId &&
      lr.status === 'diterima',
  );

  // Peserta?
  const isPeserta = session.pesertaIds.includes(currentUserId);

  // Status global: boleh presensi?
  const sessionBlocked = isTutup || sudahHadir || izinDiterima !== undefined || !isPeserta;

  const locked = sessionBlocked || !locationState.canAttend;

  const asistenName = session.asistenNama || 'Asisten Lab';

  const openAppSettings = () => Linking.openSettings();

  return (
    <Screen withTabBar={false}>
      <TopBar title="Presensi Praktikum" back fallback="/jadwal" />

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

        {isPeserta && !sudahHadir && izinDiterima && (
          <DeviceStatusCard
            title="Izin Diterima"
            message="Anda sudah memiliki pengajuan izin yang diterima untuk sesi ini. Presensi tidak diperlukan."
            tone="warning"
            icon="document-text-outline"
          />
        )}

        {/* ========== 3. KARTU PEMERIKSAAN LOKASI ========== */}
        {isPeserta && isDibuka && !sudahHadir && !izinDiterima && (
          <LocationCheckCard state={locationState} onOpenSettings={openAppSettings} />
        )}

        {/* ========== 4. KARTU AKSI PRESENSI ========== */}
        {isPeserta && isDibuka && !sudahHadir && !izinDiterima && (
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

/**
 * Kartu pemeriksaan lokasi: tampil jarak, badge in/out, tombol Perbarui,
 * atau DeviceStatusCard untuk kondisi error.
 */
function LocationCheckCard({
  state,
  onOpenSettings,
}: {
  state: ReturnType<typeof useLocationValidation>;
  onOpenSettings: () => void;
}) {
  // Kondisi error → DeviceStatusCard
  if (state.permissionStatus === 'denied') {
    return (
      <DeviceStatusCard
        title="Akses Lokasi Ditolak"
        message="HadirKu memerlukan izin akses lokasi untuk memastikan Anda berada di dalam radius laboratorium."
        tone="danger"
        actionLabel="Buka Pengaturan"
        onAction={onOpenSettings}
        icon="location-outline"
      />
    );
  }
  if (state.permissionStatus === 'services_off') {
    return (
      <DeviceStatusCard
        title="Layanan Lokasi Nonaktif"
        message="Aktifkan GPS pada perangkat Anda agar posisi terhadap laboratorium dapat diperiksa."
        tone="danger"
        actionLabel="Coba Lagi"
        onAction={state.refreshLocation}
        icon="locate-outline"
      />
    );
  }
  if (state.permissionStatus === 'timeout') {
    return (
      <DeviceStatusCard
        title="Mencari Titik Koordinat"
        message="Koordinat lokasi perangkat belum tersedia. Pastikan Anda berada di area dengan sinyal GPS memadai."
        tone="warning"
        actionLabel="Muat Ulang Lokasi"
        onAction={state.refreshLocation}
        icon="compass-outline"
      />
    );
  }
  if (state.isMocked) {
    return (
      <DeviceStatusCard
        title="Lokasi Palsu Terdeteksi"
        message="Matikan aplikasi pemalsu lokasi (Fake GPS) di perangkat Anda untuk melanjutkan presensi."
        tone="danger"
        actionLabel="Periksa Ulang"
        onAction={state.refreshLocation}
        icon="warning-outline"
      />
    );
  }

  // Loading awal
  if (state.loading && state.currentCoords === null) {
    return (
      <GlassCard style={styles.locationCard}>
        <Text style={styles.locationStatusText}>Memeriksa lokasi</Text>
      </GlassCard>
    );
  }

  // Tampilan normal: jarak + badge
  const jarakText =
    state.jarakMeter !== null ? `${state.jarakMeter} m` : 'Belum terhitung';
  const radiusText =
    state.labRadiusMeter !== null ? `${state.labRadiusMeter} m` : '-';

  return (
    <GlassCard style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <Ionicons
          name={state.isWithinRadius ? 'checkmark-circle' : 'alert-circle'}
          size={28}
          color={state.isWithinRadius ? Palette.primary : Palette.danger}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.locationTitle}>
            {state.isWithinRadius ? 'Di Dalam Radius' : 'Di Luar Radius'}
          </Text>
          <Text style={styles.locationMeta}>
            Jarak Anda ke {state.labName ?? 'Lab'}: {jarakText}
          </Text>
          <Text style={styles.locationMetaSub}>
            Batas radius maksimal: {radiusText}
          </Text>
        </View>
      </View>

      {!state.isWithinRadius && (
        <Text style={styles.locationWarning}>
          Anda berada di luar radius laboratorium. Dekati area praktikum lalu tekan Perbarui Lokasi.
        </Text>
      )}

      <Pressable
        onPress={state.refreshLocation}
        style={styles.refreshButton}
        disabled={state.loading}>
        <Ionicons name="refresh" size={16} color={Palette.text} />
        <Text style={styles.refreshButtonText}>
          {state.loading ? 'Memuat' : 'Perbarui Lokasi'}
        </Text>
      </Pressable>
    </GlassCard>
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

  locationCard: { gap: Spacing.two },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
  },
  locationMeta: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  locationMetaSub: {
    fontSize: 12,
    color: Palette.textMuted,
  },
  locationStatusText: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
  },
  locationWarning: {
    fontSize: 13,
    color: Palette.danger,
    lineHeight: 18,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
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