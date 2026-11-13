import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Badge, ListRow, Screen, TopBar } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useAuth, useCurrentUser } from '@/context/auth-context';

export default function ProfilScreen() {
  const { firebaseUser, currentUser, signOut } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const displayName = currentUser?.nama || firebaseUser?.displayName || 'Pengguna';
  const isAsisten = currentUser?.role === 'asisten';
  const roleLabel = currentUser ? (isAsisten ? 'Asisten Laboratorium' : 'Praktikan') : 'Profil Belum Lengkap';
  const emailDisplay = currentUser?.email || firebaseUser?.email || '-';
  const nimDisplay = currentUser?.nim || 'Belum diisi';

  async function handleLogout() {
    setShowLogoutConfirm(false);
    await signOut();
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
        <ListRow title="Versi Aplikasi" subtitle="2.0.0 (Sprint 2)" />
      </View>

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