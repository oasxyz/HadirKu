import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { IlustrasiSapaan } from '@/components/ilustrasi';
import { TextField } from '@/components/text-field';
import { Chip, GlassCard, Screen, SelectField, TopBar } from '@/components/ui';
import { OPSI_KELAS } from '@/constants/kelas';
import { useToast } from '@/components/toast';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import type { Role } from '@/types';
import { getAuthErrorMessage } from '@/utils/auth-error';

export default function RegisterScreen() {
  const { signUp } = useAuth();

  const [nama, setNama] = useState('');
  const [nim, setNim] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('praktikan');
  const [kelas, setKelas] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const { tampilkanToast } = useToast();
  // Pesan error tampil sebagai toast melayang di atas layar.
  const setError = (pesan: string | null) => {
    setErrorState(pesan);
    if (pesan) tampilkanToast(pesan, 'error', 'Pendaftaran gagal');
  };

  async function handleRegister() {
    if (!nama.trim() || !nim.trim() || !email.trim() || !password) {
      setError('Semua kolom wajib diisi');
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

    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await signUp({
        nama,
        nim,
        email,
        password,
        role,
        kelas: role === 'praktikan' ? kelas : undefined,
      });
      // Pendaftaran sukses & otomatis login -> langsung arahkan ke beranda
      router.replace('/jadwal' as Href);
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen withTabBar={false}>
      <TopBar title="Daftar Akun" back fallback="/login" />

      <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}>
        {/* Banner berilustrasi, gaya sama dengan halaman Login. */}
        <View style={styles.hero}>
          <IlustrasiSapaan lebar={300} />
        </View>

        <GlassCard style={styles.sheet}>
          <Text style={styles.heading}>Buat Akun Baru</Text>
          <Text style={styles.subtitle}>
            Lengkapi data diri untuk mengakses presensi dan jadwal praktikum.
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
              label="Email Institusi"
              placeholder="nama@univ.ac.id"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextField
              label="Kata Sandi"
              placeholder="Minimal 6 karakter"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(null);
              }}
              isPassword
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
            onPress={handleRegister}
            disabled={loading}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.utamaBtn,
              loading && { opacity: 0.6 },
              pressed && { opacity: 0.8 },
            ]}>
            <Text style={styles.utamaBtnText}>{loading ? 'Mendaftar…' : 'Daftar'}</Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Sudah punya akun? </Text>
            <Pressable onPress={() => router.replace('/login' as Href)}>
              <Text style={styles.loginLink}>Masuk</Text>
            </Pressable>
          </View>
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
    justifyContent: 'flex-end',
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
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerText: {
    color: Palette.textSecondary,
    fontSize: 13,
  },
  loginLink: {
    color: Palette.text,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});