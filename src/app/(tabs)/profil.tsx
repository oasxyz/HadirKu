import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { IlustrasiSapaan } from '@/components/ilustrasi';
import { KartuKelasPraktikan } from '@/components/kartu-kelas-praktikan';
import { BarisNotifikasi } from '@/components/notifikasi/baris-notifikasi';
import { KartuKondisi } from '@/components/peta/kartu-kondisi';
import { useToast } from '@/components/toast';
import { Avatar, Badge, GlassCard, Screen, SectionTitle, TopBar } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import {
  hapusPushToken,
  useNotifikasiSaya,
  usePushNotifikasi,
  type StatusPush,
} from '@/services/notifications';
import { tujuanNotifikasi } from '@/utils/tujuan-notifikasi';
import { isAslabLike, isStafLab } from '@/types';

// SRS4-04: Profil hanya menampilkan 3 notifikasi terbaru; sisanya di halaman /notifikasi.
const MAKS_NOTIF = 3;

const LABEL_STATUS_PUSH: Record<StatusPush, string> = {
  memeriksa: 'Memeriksa…',
  aktif: 'Aktif',
  ditolak: 'Izin notifikasi ditolak',
  tidak_didukung: 'Tidak didukung di perangkat ini',
  gagal: 'Belum tersambung',
};

export default function ProfilScreen() {
  const { firebaseUser, currentUser, signOut } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const push = usePushNotifikasi();
  const { tampilkanToast } = useToast();
  const notif = useNotifikasiSaya();

  const displayName = currentUser?.nama || firebaseUser?.displayName || 'Pengguna';
  const isAsisten = isStafLab(currentUser?.role);
  // Sprint 4: label sesuai peran baru; 'asisten' (alias lama) dibaca sebagai asisten praktikum.
  const roleLabel = !currentUser
    ? 'Profil Belum Lengkap'
    : isAslabLike(currentUser.role)
      ? 'Asisten Lab'
      : isAsisten
        ? 'Asisten Praktikum'
        : 'Praktikan';
  const emailDisplay = currentUser?.email || firebaseUser?.email || '-';
  const nimDisplay = currentUser?.nim || 'Belum diisi';

  async function handleLogout() {
    setShowLogoutConfirm(false);
    // SRS3-04 / QA #7: cabut token perangkat SEBELUM keluar, supaya notifikasi akun ini
    // tidak lagi terkirim ke perangkat yang nanti dipakai akun lain.
    if (currentUser) await hapusPushToken(currentUser.id);
    await signOut();
    tampilkanToast('Sampai jumpa lagi di sesi praktikum berikutnya.', 'info', 'Kamu sudah keluar');
    router.replace('/login' as Href);
  }

  return (
    <Screen>
      <TopBar title="Profil" />

      {/* Banner lilac berilustrasi; avatar menumpang di tepi bawahnya. */}
      <View style={styles.banner}>
        <IlustrasiSapaan lebar={340} />
      </View>
      <View style={styles.header}>
        <View style={styles.avatarRing}>
          <Avatar nama={displayName} size={96} />
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Badge
          label={roleLabel}
          tone="outline"
        />
      </View>

      {/* Data akun dalam satu kartu solid, dipisah garis tipis. */}
      <View style={styles.infoCard}>
        {[
          ['NIM', nimDisplay],
          ['Email Institusi', emailDisplay],
          ['Notifikasi', LABEL_STATUS_PUSH[push.status]],
          ['Versi Aplikasi', '3.0.0 (Sprint 3)'],
        ].map(([judul, isi], i) => (
          <View key={judul} style={[styles.infoRow, i > 0 && styles.infoRowGaris]}>
            <Text style={styles.infoJudul}>{judul}</Text>
            <Text style={styles.infoIsi} numberOfLines={1}>
              {isi}
            </Text>
          </View>
        ))}
      </View>

      {/* Praktikan memilih kelasnya sendiri; asisten memakai kelas ini untuk mengisi peserta sesi. */}
      {/* Kelas praktikum: pilih pertama kali, lalu pindah lewat persetujuan asisten. */}
      {!isAsisten && currentUser ? <KartuKelasPraktikan /> : null}

      {push.status === 'ditolak' ? (
        <GlassCard>
          <KartuKondisi
            judul="Notifikasi Belum Aktif"
            pesan="Aktifkan izin notifikasi agar Anda menerima pemberitahuan saat sesi dibuka, jadwal berubah, atau izin diputuskan."
            aksi="Buka Pengaturan"
            onAksi={() => {
              Linking.openSettings().catch(() => undefined);
            }}
          />
        </GlassCard>
      ) : push.status === 'gagal' ? (
        <GlassCard>
          <KartuKondisi
            judul="Notifikasi Belum Tersambung"
            pesan="Perangkat belum terdaftar untuk menerima notifikasi. Periksa koneksi internet Anda lalu coba lagi."
            aksi="Coba Lagi"
            onAksi={push.cobaLagi}
          />
        </GlassCard>
      ) : null}

      {/* SRS3-04: notifikasi in-app, cadangan bila push tidak sampai ke perangkat */}
      <GlassCard style={[styles.notifCard, styles.kartuSolid]}>
        <SectionTitle
          title={
            notif.jumlahBelumDibaca > 0
              ? `Pemberitahuan (${notif.jumlahBelumDibaca} baru)`
              : 'Pemberitahuan'
          }
          right={
            notif.jumlahBelumDibaca > 0 ? (
              <Pressable
                onPress={notif.tandaiSemuaDibaca}
                hitSlop={8}
                accessibilityRole="button"
                style={({ pressed }) => [styles.notifActionBtn, pressed && { opacity: 0.7 }]}>
                <Text style={styles.notifAction}>Tandai dibaca</Text>
              </Pressable>
            ) : undefined
          }
        />
        {notif.loading ? (
          <ActivityIndicator color={Palette.primary} />
        ) : notif.error ? (
          <Text style={styles.notifEmpty}>{notif.error}</Text>
        ) : notif.items.length === 0 ? (
          <Text style={styles.notifEmpty}>Belum ada pemberitahuan.</Text>
        ) : (
          <>
            {notif.items.slice(0, MAKS_NOTIF).map((item) => {
              const baru = !notif.sudahDibaca(item);
              return (
                <BarisNotifikasi
                  key={item.id}
                  item={item}
                  baru={baru}
                  onPress={() => {
                    if (baru) void notif.tandaiDibaca([item.id]);
                    router.push(tujuanNotifikasi(item) as Href);
                  }}
                />
              );
            })}
            <Pressable
              onPress={() => router.push('/notifikasi' as Href)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.lihatSemua, pressed && { opacity: 0.7 }]}>
              <Text style={styles.lihatSemuaTeks}>
                {notif.items.length > MAKS_NOTIF ? `Lihat semua (${notif.items.length})` : 'Lihat semua'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={Palette.text} />
            </Pressable>
          </>
        )}
      </GlassCard>

      <Pressable
        onPress={() => setShowLogoutConfirm(true)}
        style={({ pressed }) => [styles.logout, pressed && { opacity: 0.7 }]}>
        <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
        <Text style={styles.logoutText}>Keluar</Text>
      </Pressable>

      {/* Modal Dialog Konfirmasi Logout */}
      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Keluar dari akun?</Text>
            <Text style={styles.modalDesc}>
              Anda harus masuk kembali menggunakan email dan kata sandi untuk mengakses jadwal praktikum.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowLogoutConfirm(false)}
                style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.7 }]}>
                <Text style={styles.confirmBtnText}>Keluar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: Palette.warningMuted,
    borderRadius: 28,
    height: 150,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    gap: 8,
    marginTop: -64,
  },
  avatarRing: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    padding: 4,
  },
  name: {
    color: Palette.text,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Kartu solid, latar sama dengan kartu Timeline/Rekap.
  kartuSolid: {
    backgroundColor: '#F7F6FB',
    borderColor: Palette.border,
  },
  infoCard: {
    backgroundColor: '#F7F6FB',
    borderColor: Palette.border,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  infoRowGaris: {
    borderTopColor: Palette.border,
    borderTopWidth: 1,
  },
  infoJudul: {
    color: Palette.text,
    fontSize: 14,
    fontWeight: '600',
  },
  infoIsi: {
    color: Palette.textSecondary,
    flexShrink: 1,
    fontSize: 13,
    textAlign: 'right',
  },
  notifCard: {
    gap: 12,
  },
  notifActionBtn: {
    backgroundColor: Palette.lavender,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  notifAction: {
    color: Palette.text,
    fontSize: 12,
    fontWeight: '700',
  },
  notifEmpty: {
    color: Palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  lihatSemua: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Palette.lavender,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  lihatSemuaTeks: {
    color: Palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  logout: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    height: 56,
    justifyContent: 'center',
    marginTop: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 15,
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
  confirmBtn: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: 999,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});