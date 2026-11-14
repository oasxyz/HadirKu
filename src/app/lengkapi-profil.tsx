import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { TextField } from '@/components/text-field';
import { Chip, GlassCard, PrimaryButton, Screen, TopBar } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import type { Role } from '@/types';
import { getAuthErrorMessage } from '@/utils/auth-error';

export default function LengkapiProfilScreen() {
  const { firebaseUser, currentUser, completeProfile, signOut } = useAuth();

  const [nama, setNama] = useState(firebaseUser?.displayName ?? '');
  const [nim, setNim] = useState('');
  const [role, setRole] = useState<Role>('praktikan');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    try {
      setError(null);
      setLoading(true);
      await completeProfile({
        nama,
        nim,
        role,
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
        <GlassCard style={styles.sheet}>
          <Text style={styles.heading}>Satu Langkah Lagi</Text>
          <Text style={styles.subtitle}>
            Lengkapi data NIM dan peran untuk mendaftarkan akun praktikummu.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

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
          </View>

          <PrimaryButton
            label={loading ? 'Menyimpan…' : 'Simpan & Lanjutkan'}
            onPress={handleSave}
            disabled={loading}
          />

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
  sheet: {
    borderRadius: 36,
    gap: 16,
    padding: 24,
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
  errorBox: {
    backgroundColor: 'rgba(225, 29, 72, 0.08)',
    borderColor: 'rgba(225, 29, 72, 0.3)',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: {
    color: Palette.danger,
    fontSize: 13,
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