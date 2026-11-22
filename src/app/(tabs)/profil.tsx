import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { KartuKondisi } from '@/components/peta/kartu-kondisi';
import { useToast } from '@/components/toast';
import { Avatar, Badge, GlassCard, ListRow, Screen, SectionTitle, TopBar } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import {
  hapusPushToken,
  useNotifikasiSaya,
  usePushNotifikasi,
  type StatusPush,
} from '@/services/notifications';

const MAKS_NOTIF = 10;

/** "2026-11-20T14:05:00Z" -> "20 Nov, 21.05" (jam perangkat). */
function formatWaktuNotif(iso: string): string {
  const waktu = new Date(iso);
  if (Number.isNaN(waktu.getTime())) return '';
  return waktu.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
  const isAsisten = currentUser?.role === 'asisten';
  const roleLabel = currentUser ? (isAsisten ? 'Asisten Laboratorium' : 'Praktikan') : 'Profil Belum Lengkap';
  const emailDisplay = currentUser?.email || firebaseUser?.email || '-';
  const nimDisplay = currentUser?.nim || 'Belum diisi';

  async function handleLogout() {
    setShowLogoutConfirm(false);
    // SRS3-04 / QA #7: cabut token perangkat SEBELUM keluar, supaya notifikasi akun ini
    // tidak lagi terkirim ke perangkat yang nanti dipakai akun lain.
    if (currentUser) await hapusPushToken(currentUser.id);
    await signOut();
    tampilkanToast('Kamu sudah keluar dari akun.', 'info');
    router.replace('/login' as Href);
  }

  return (
    <Screen>
      <TopBar title="Profil" />

      <View style={styles.header}>
        <Avatar nama={displayName} size={104} />
        <Text style={styles.name}>{displayName}</Text>
        <Badge
          label={roleLabel}
          tone="outline"
        />
      </View>

      <View style={styles.list}>
        <ListRow title="NIM" subtitle={nimDisplay} />
        <ListRow title="Email Institusi" subtitle={emailDisplay} />
        <ListRow title="Notifikasi" subtitle={LABEL_STATUS_PUSH[push.status]} />
        <ListRow title="Versi Aplikasi" subtitle="3.0.0 (Sprint 3)" />
      </View>

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
      <GlassCard style={styles.notifCard}>
        <SectionTitle
          title={
            notif.jumlahBelumDibaca > 0
              ? `Pemberitahuan (${notif.jumlahBelumDibaca} baru)`
              : 'Pemberitahuan'
          }
          right={
            notif.jumlahBelumDibaca > 0 ? (
              <Pressable onPress={notif.tandaiSemuaDibaca} hitSlop={8} accessibilityRole="button">
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
          notif.items.slice(0, MAKS_NOTIF).map((item) => {
            const baru = !notif.sudahDibaca(item);
            return (
              <Pressable
                key={item.id}
                onPress={() => (baru ? notif.tandaiDibaca([item.id]) : undefined)}
                accessibilityRole="button"
                accessibilityLabel={`${baru ? 'Belum dibaca. ' : ''}${item.title}. ${item.body}`}
                style={({ pressed }) => [styles.notifRow, pressed && { opacity: 0.7 }]}>
                <View style={[styles.notifDot, baru && styles.notifDotNew]} />
                <View style={styles.notifText}>
                  <Text style={[styles.notifTitle, baru && styles.notifTitleNew]}>{item.title}</Text>
                  <Text style={styles.notifBody}>{item.body}</Text>
                  <Text style={styles.notifTime}>{formatWaktuNotif(item.createdAt)}</Text>
                </View>
              </Pressable>
            );
          })
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
  header: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  name: {
    color: Palette.text,
    fontSize: 26,
    fontWeight: '600',
    textAlign: 'center',
  },
  list: {
    gap: 12,
  },
  notifCard: {
    gap: 12,
  },
  notifAction: {
    color: Palette.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  notifEmpty: {
    color: Palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  notifRow: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  notifDot: {
    borderRadius: 999,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  notifDotNew: {
    backgroundColor: Palette.primary,
  },
  notifText: {
    flex: 1,
    gap: 2,
  },
  notifTitle: {
    color: Palette.text,
    fontSize: 14,
    fontWeight: '500',
  },
  notifTitleNew: {
    fontWeight: '700',
  },
  notifBody: {
    color: Palette.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  notifTime: {
    color: Palette.textMuted,
    fontSize: 11,
    marginTop: 2,
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