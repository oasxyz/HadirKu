import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AttendanceAction } from '@/components/attendance-action';
import { LocationCheckCard } from '@/components/location-check-card';
import SessionControls from '@/components/session-controls';
import {
  IlustrasiDitutup,
  IlustrasiHadir,
  IlustrasiIzinDiterima,
  IlustrasiKosong,
  IlustrasiLab,
  IlustrasiMenunggu,
} from '@/components/ilustrasi';
import { useToast } from '@/components/toast';
import {
  Avatar,
  Chip,
  DeviceStatusCard,
  EmptyNote,
  GlassCard,
  RoundButton,
  Screen,
  SectionTitle,
  TopBar,
} from '@/components/ui';
import { Palette, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { useLeaveRequests } from '@/hooks/use-leave-requests';
import { useLocationValidation } from '@/hooks/useLocationValidation';
import { useSessions } from '@/hooks/use-sessions';
import { usePraktikanList } from '@/hooks/use-users';
import { formatRentangJam, formatTanggalSingkat } from '@/utils/format';
import { Logger } from '@/utils/logger';
import { sesiSudahBerakhir } from '@/utils/sesi';
import type { Session } from '@/types';

// Kotak status berteks putih, warnanya sama dengan kartu Sesi Terdekat di Beranda.
const LABEL_STATUS: Record<Session['status'], string> = {
  belum_dibuka: 'Belum dibuka',
  dibuka: 'Sedang dibuka',
  ditutup: 'Sudah ditutup',
};
const WARNA_STATUS: Record<Session['status'], string> = {
  belum_dibuka: Palette.textMuted,
  dibuka: Palette.primary,
  ditutup: Palette.ink,
};

export default function SesiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useCurrentUser();
  const { sessions, attendances, deleteSession } = useSessions();
  const { praktikanList } = usePraktikanList();
  const { leaveRequests } = useLeaveRequests();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { tampilkanToast } = useToast();

  const session = sessions.find((item) => item.id === id);
  const isAsisten = currentUser?.role === 'asisten';
  const locationState = useLocationValidation(session?.labId);

  if (!session) {
    return (
      <Screen header={<TopBar title="Detail Sesi" back fallback="/jadwal" />}>
        <EmptyNote message="Sesi praktikum tidak ditemukan atau telah dihapus." />
      </Screen>
    );
  }

  const currentUserId = currentUser?.id ?? '';
  const isPeserta = session.pesertaIds.includes(currentUserId);
  const myAttendance = attendances.find(
    (a) => a.sessionId === session.id && a.userId === currentUserId,
  );
  const myLeave = leaveRequests.find(
    (lr) =>
      lr.sessionId === session.id &&
      lr.userId === currentUserId &&
      (lr.status === 'menunggu' || lr.status === 'diterima'),
  );
  const sesiBerakhir = sesiSudahBerakhir(session);
  const isDitutup = session.status === 'ditutup' || sesiBerakhir;

  // Nama asisten disalin ke dokumen sesi saat sesi dibuat (denormalisasi), sehingga
  // praktikan tidak perlu membaca dokumen users asisten (dilarang firestore.rules).
  // Pakai `||` (bukan `??`) supaya nama kosong tetap jatuh ke fallback.
  const asistenName =
    session.asistenNama ||
    (session.asistenId === currentUser?.id ? currentUser?.nama : undefined) ||
    'Asisten Lab';

  // Rekap kehadiran realtime (diurutkan dari yang paling baru presensi)
  const hadir = attendances
    .filter((item) => item.sessionId === session.id)
    .sort((a, b) => new Date(b.waktuPresensi).getTime() - new Date(a.waktuPresensi).getTime())
    .map((item) => {
      const user = praktikanList.find((p) => p.id === item.userId);
      return { item, user };
    });

  async function handleDelete() {
    if (!session) return;
    
    try {
      setDeleting(true);
      await deleteSession(session.id);
      setShowDeleteModal(false);
      tampilkanToast('Sesi dan jadwalnya sudah dihapus dari daftar.', 'sukses', 'Sesi dihapus');
      router.replace('/jadwal' as Href);
    } catch (e) {
      Logger.error('FIRESTORE', 'DELETE_SESSION', e);
      tampilkanToast('Periksa koneksi internet lalu coba lagi.', 'error', 'Sesi gagal dihapus');
      setDeleting(false);
    }
  }

  return (
    <Screen
      header={
        <TopBar
          title="Detail Sesi"
          back
          fallback="/jadwal"
          right={
            isAsisten && session.status !== 'ditutup' ? (
              <RoundButton
                icon="create-outline"
                onPress={() =>
                  router.push({
                    pathname: '/jadwal/form' as any,
                    params: { id: session.id },
                  })
                }
              />
            ) : null
          }
        />
      }>
      <View style={styles.person}>
        <View style={styles.personText}>
          <Text style={styles.personRole}>Asisten Pembimbing</Text>
          <Text style={styles.personName}>{asistenName}</Text>
        </View>
        <Avatar nama={asistenName} size={64} />
      </View>

      {/* Kartu sesi bergaya sama dengan kartu Sesi Terdekat di Beranda. */}
      {/* Kiri: status, judul, lalu jam/tanggal/lab masing-masing satu baris.
          Kanan: ilustrasi duduk di bawah, tidak terdorong oleh panjang chip. */}
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <View style={[styles.statusBox, { backgroundColor: WARNA_STATUS[session.status] }]}>
            <Text style={styles.statusText}>{LABEL_STATUS[session.status]}</Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {session.praktikum}
          </Text>
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <Text style={[styles.heroChipText, styles.heroChipTebal]}>
                {formatRentangJam(session.jamMulai, session.jamSelesai)}
              </Text>
            </View>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{formatTanggalSingkat(session.tanggal)}</Text>
            </View>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText} numberOfLines={1}>
                {session.kelasLab}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.heroArt}>
          <IlustrasiLab lebar={120} />
        </View>
      </View>

      {/* Komponen Sesi (Asisten) atau Presensi (Praktikan) */}
      <SectionTitle title={isAsisten ? 'Kelola Sesi' : 'Presensi'} />
      {isAsisten ? (
        <SessionControls sessionId={session.id} />
      ) : (
        <View style={{ gap: Spacing.two }}>
          {!isPeserta ? (
            <DeviceStatusCard
              title="Bukan Peserta"
              message="Anda tidak terdaftar sebagai praktikan pada sesi praktikum ini."
              tone="warning"
              icon="person-remove-outline"
              ilustrasi={<IlustrasiKosong lebar={110} />}
            />
          ) : myAttendance ? (
            <GlassCard style={styles.successCard}>
              <IlustrasiHadir lebar={130} />
              <Text style={styles.successTitle}>Sudah Hadir</Text>
              <Text style={styles.successSubtitle}>
                Tercatat pada{' '}
                {new Date(myAttendance.waktuPresensi).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </GlassCard>
          ) : myLeave ? (
            <DeviceStatusCard
              title={
                myLeave.status === 'diterima'
                  ? 'Izin Diterima'
                  : 'Pengajuan Izin Sedang Diproses'
              }
              message={
                myLeave.status === 'diterima'
                  ? 'Pengajuan izin Anda telah diterima untuk sesi ini. Presensi tidak diperlukan.'
                  : 'Pengajuan izin Anda sedang menunggu konfirmasi asisten. Fitur presensi untuk sesi ini terkunci.'
              }
              tone="warning"
              icon="document-text-outline"
              ilustrasi={myLeave.status === 'diterima' ? <IlustrasiIzinDiterima lebar={120} /> : <IlustrasiMenunggu lebar={120} />}
            />
          ) : isDitutup ? (
            <DeviceStatusCard
              title="Sesi Sudah Ditutup"
              message="Presensi untuk sesi praktikum ini telah berakhir."
              tone="danger"
              icon="lock-closed-outline"
              ilustrasi={<IlustrasiDitutup lebar={120} />}
            />
          ) : session.status === 'belum_dibuka' ? (
            <DeviceStatusCard
              title="Sesi Belum Dibuka"
              message="Asisten belum membuka sesi presensi. Silakan tunggu sampai sesi dibuka."
              tone="warning"
              icon="hourglass-outline"
              ilustrasi={<IlustrasiMenunggu lebar={120} />}
            />
          ) : (
            <View style={{ gap: Spacing.two }}>
              <LocationCheckCard
                state={locationState}
                onOpenSettings={() => Linking.openSettings()}
              />
              <AttendanceAction
                sessionId={session.id}
                session={session}
                jarakMeter={locationState.jarakMeter}
                radiusMeter={locationState.labRadiusMeter}
                locked={!locationState.canAttend}
              />
            </View>
          )}
        </View>
      )}

      {/* Rekap Kehadiran untuk Asisten */}
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
            <View style={styles.emptyBox}>
              <IlustrasiKosong lebar={84} />
              <Text style={styles.empty}>Belum ada praktikan yang presensi.</Text>
            </View>
          ) : (
            hadir.map(({ item, user }) => (
              <View key={item.id} style={styles.attendee}>
                <View style={styles.attendeeText}>
                  <Text style={styles.attendeeName}>{user?.nama ?? 'Praktikan'}</Text>
                  <Text style={styles.attendeeNim}>{user?.nim ?? ''}</Text>
                </View>
                <Chip
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

      {/* Tombol Hapus Sesi (Hanya Asisten) */}
      {isAsisten ? (
        <Pressable
          onPress={() => setShowDeleteModal(true)}
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}>
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          <Text style={styles.deleteBtnText}>Hapus Sesi</Text>
        </Pressable>
      ) : null}

      {/* Dialog Konfirmasi Hapus Sesi */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Hapus sesi ini?</Text>
            <Text style={styles.modalDesc}>
              Sesi {session.praktikum} akan dihapus secara permanen beserta data kehadiran yang terkait.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                disabled={deleting}
                style={({ pressed }) => [styles.confirmDeleteBtn, pressed && { opacity: 0.7 }]}>
                <Text style={styles.confirmDeleteBtnText}>
                  {deleting ? 'Menghapus…' : 'Hapus'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 26,
    fontWeight: '600',
    lineHeight: 32,
  },
  hero: {
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
  heroText: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 10,
  },
  heroArt: {
    marginRight: -8,
  },
  statusBox: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // Chip ringkas di kartu sesi; jam diberi teks tebal.
  heroChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: Palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroChipText: {
    color: Palette.text,
    fontSize: 12,
    fontWeight: '500',
  },
  heroChipTebal: {
    fontWeight: '700',
  },
  heroTitle: {
    color: Palette.text,
    fontSize: 20,
    fontWeight: '600',
  },
  heroChips: {
    alignItems: 'flex-start',
    gap: 6,
  },
  listCard: {
    gap: 12,
  },
  count: {
    color: Palette.textMuted,
    fontSize: 13,
  },
  emptyBox: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  empty: {
    color: Palette.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  attendee: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 10,
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 9,
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
  deleteBtn: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    marginTop: 6,
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    gap: 14,
    maxWidth: 360,
    padding: 24,
    width: '100%',
  },
  modalTitle: {
    color: Palette.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalDesc: {
    color: Palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  cancelBtn: {
    alignItems: 'center',
    borderColor: Palette.border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: Palette.text,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmDeleteBtn: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: 999,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  confirmDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  successCard: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 24,
  },
  successTitle: {
    color: Palette.text,
    fontSize: 18,
    fontWeight: '700',
  },
  successSubtitle: {
    color: Palette.textMuted,
    fontSize: 13,
  },
  presensiHint: {
    color: Palette.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});