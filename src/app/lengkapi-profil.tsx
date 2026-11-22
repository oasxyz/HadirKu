import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { IlustrasiPapanKlip } from '@/components/ilustrasi';
import { TextField } from '@/components/text-field';
import { Chip, GlassCard, Screen, SelectField, TopBar } from '@/components/ui';
import { OPSI_KELAS } from '@/constants/kelas';
import { useToast } from '@/components/toast';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import type { Role } from '@/types';
import { getAuthErrorMessage } from '@/utils/auth-error';

export default function LengkapiProfilScreen() {
  const { firebaseUser, currentUser, completeProfile, signOut } = useAuth();

  const [nama, setNama] = useState(firebaseUser?.displayName ?? '');
  const [nim, setNim] = useState('');
  const [role, setRole] = useState<Role>('praktikan');
  const [kelas, setKelas] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const { tampilkanToast } = useToast();
  // Pesan error tampil sebagai toast melayang di atas layar.
  const setError = (pesan: string | null) => {
    setErrorState(pesan);
    if (pesan) tampilkanToast(pesan, 'error', 'Profil gagal disimpan');
  };

  // Layar ini hanya untuk akun yang belum punya dokumen profil. Kalau profil sudah
  // ada (mis. dibuka lewat back stack), jangan biarkan nama/NIM tertimpa.
  useEffect(() => {
    if (currentUser) {
      router.replace('/jadwal' as Href);
    }
  }, [currentUser]);

  async function handleSave() {
    if (!nama.trim() || !nim.trim()) {
      setError('Nama lengkap dan NIM wajib diisi');
      return;
    }

    if (!/^\d{6,20}$/.test(nim.trim())) {
      setError('NIM harus berupa angka (6–20 digit)');
      return;
    }

    if (role === 'praktikan' && !kelas) {
      setError('Pilih kelas praktikummu');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await completeProfile({
        nama,
        nim,
        role,
        kelas: role === 'praktikan' ? kelas : undefined,
      });
      // Sukses menyimpan profil -> langsung arahkan ke beranda
      router.replace('/jadwal' as Href);
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    try {
      setLoading(true);
      await signOut();
    } catch {
      // Abaikan: tetap arahkan ke login walau sign out gagal sebagian.
    } finally {
      setLoading(false);
      router.replace('/login' as Href);
    }
  }

  return (
    <Screen withTabBar={false}>
      <TopBar
        title="Lengkapi Profil"
        right={
          <Pressable
            onPress={handleCancel}
            disabled={loading}
            hitSlop={8}
            accessibilityLabel="Batalkan pendaftaran">
            <Ionicons name="close" size={24} color={Palette.text} />
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        {/* Banner berilustrasi, gaya sama dengan halaman Login. */}
        <View style={styles.hero}>
          <IlustrasiPapanKlip lebar={130} />
        </View>

        <GlassCard style={styles.sheet}>
          <Text style={styles.heading}>Satu Langkah Lagi</Text>
          <Text style={styles.subtitle}>
            Lengkapi data NIM dan peran untuk mendaftarkan akun praktikummu.
          </Text>

          <View style={styles.form}>
            <TextField
              label="Nama Lengkap"
              placeholder="Contoh: Budi Santoso"
              value={nama}
              onChangeText={(text) => {
                setNama(text);
                if (error) setError(null);
              }}
            />

            <TextField
              label="NIM"
              placeholder="Contoh: 21120120140000"
              value={nim}
              onChangeText={(text) => {
                setNim(text);
                if (error) setError(null);
              }}
              keyboardType="numeric"
            />

            <TextField
              label="Email Google"
              value={firebaseUser?.email ?? '-'}
              editable={false}
              style={styles.disabledInput}
            />

            {/* Pilihan Peran */}
            <View style={styles.roleSection}>
              <Text style={styles.roleLabel}>Peran Akun</Text>
              <View style={styles.chips}>
                <Chip
                  label="Praktikan"
                  selected={role === 'praktikan'}
                  onPress={() => setRole('praktikan')}
                />
                <Chip
                  label="Asisten"
                  selected={role === 'asisten'}
                  onPress={() => setRole('asisten')}
                />
              </View>
              <Text style={styles.roleHint}>Peran tidak bisa diubah setelah mendaftar.</Text>
            </View>

            {/* Kelas menentukan sesi praktikum yang otomatis diikuti praktikan. */}
            {role === 'praktikan' ? (
              <SelectField
                label="Kelas Praktikum"
                value={kelas}
                options={OPSI_KELAS}
                onSelect={setKelas}
                error={Boolean(error && !kelas)}
              />
            ) : null}
          </View>

          <Pressable
            onPress={handleSave}
            disabled={loading}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.utamaBtn,
              loading && { opacity: 0.6 },
              pressed && { opacity: 0.8 },
            ]}>
            <Text style={styles.utamaBtnText}>
              {loading ? 'Menyimpan…' : 'Simpan & Lanjutkan'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleCancel}
            disabled={loading}
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.6 }]}>
            <Text style={styles.cancelBtnText}>Salah akun? Masuk dengan akun lain</Text>
          </Pressable>
        </GlassCard>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    borderRadius: 32,
    experimental_backgroundImage:
      'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(244, 207, 239, 0.9) 100%)',
    height: 140,
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  } as object,
  // Kartu solid, latar sama dengan kartu lain di aplikasi.
  sheet: {
    backgroundColor: '#F7F6FB',
    borderColor: Palette.border,
    borderRadius: 32,
    gap: 16,
    padding: 24,
  },
  utamaBtn: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: 999,
    height: 56,
    justifyContent: 'center',
  },
  utamaBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  heading: {
    color: Palette.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: Palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  form: {
    gap: 12,
  },
  disabledInput: {
    color: Palette.textMuted,
  },
  roleSection: {
    gap: 6,
    marginTop: 4,
  },
  roleLabel: {
    color: Palette.textMuted,
    fontSize: 12,
    fontWeight: '500',
    paddingLeft: 4,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  roleHint: {
    color: Palette.textMuted,
    fontSize: 11,
    paddingLeft: 4,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: Palette.textSecondary,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});