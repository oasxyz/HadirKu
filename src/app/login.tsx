import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { IlustrasiLaptop } from '@/components/ilustrasi';
import { TextField } from '@/components/text-field';
import { GlassCard, Screen } from '@/components/ui';
import { useToast } from '@/components/toast';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { getAuthErrorMessage } from '@/utils/auth-error';

export default function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const { tampilkanToast } = useToast();
  // Pesan error tampil sebagai toast melayang di atas layar.
  const setError = (pesan: string | null) => {
    setErrorState(pesan);
    if (pesan) tampilkanToast(pesan, 'error', 'Gagal masuk');
  };

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Email dan kata sandi wajib diisi');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const { hasProfile } = await signIn(email, password);
      // Profil sudah dibaca sebelum navigasi: akun tanpa dokumen users diarahkan
      // melengkapi profil, bukan masuk beranda dengan currentUser kosong.
      router.replace((hasProfile ? '/jadwal' : '/lengkapi-profil') as Href);
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
  try {
    setError(null);
    setLoading(true);
    const { isNewUser } = await signInWithGoogle();

    if (isNewUser) {
      // User Google baru -> wajib isi NIM & Peran terlebih dahulu
      router.replace('/lengkapi-profil' as Href);
    } else {
      // User lama yang profilnya sudah ada di Firestore -> langsung ke jadwal
      router.replace('/jadwal' as Href);
    }
  } catch (err: any) {
    // Abaikan jika user menutup/membatalkan popup Google Sign In
    if (err?.code === 'SIGN_IN_CANCELLED' || err?.message?.includes('cancelled')) {
      return;
    }
    setError(getAuthErrorMessage(err));
  } finally {
    setLoading(false);
  }
}

  return (
    <Screen withTabBar={false}>
      <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}>
        {/* Banner lilac berilustrasi, gaya sama dengan kartu sesi di Beranda. */}
        <View style={styles.hero}>
          <IlustrasiLaptop lebar={210} />
        </View>

        {/* Kartu Login */}
        <GlassCard style={styles.sheet}>
          <Text style={styles.heading}>
            Selamat Datang di{'\n'}
            <Text style={styles.headingBold}>HadirKu</Text>
          </Text>
          <Text style={styles.subtitle}>
            Masuk dengan email dan kata sandi praktikummu.
          </Text>

          <View style={styles.form}>
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
              placeholder="Masukkan kata sandi"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(null);
              }}
              isPassword
            />
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.masukBtn,
              loading && { opacity: 0.6 },
              pressed && { opacity: 0.8 },
            ]}>
            <Text style={styles.masukBtnText}>{loading ? 'Memproses…' : 'Masuk'}</Text>
          </Pressable>

          <Pressable
            onPress={handleGoogleLogin}
            disabled={loading}
            style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.7 }]}>
            {/* Logo resmi Google (identitas produk), boleh tetap berwarna asli. */}
            <Ionicons name="logo-google" size={18} color="#EA4335" />
            <Text style={styles.googleBtnText}>
              {loading ? 'Menghubungkan…' : 'Masuk dengan Google'}
            </Text>
          </Pressable>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>Belum punya akun? </Text>
            <Pressable onPress={() => router.push('/register' as Href)}>
              <Text style={styles.registerLink}>Daftar</Text>
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
    height: 210,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    paddingBottom: 8,
  } as object,
  // Kartu solid, latar sama dengan kartu lain di aplikasi.
  sheet: {
    backgroundColor: '#F7F6FB',
    borderColor: Palette.border,
    borderRadius: 32,
    gap: 16,
    marginTop: 14,
    padding: 24,
  },
  masukBtn: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: 999,
    height: 56,
    justifyContent: 'center',
  },
  masukBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  heading: {
    color: Palette.text,
    fontSize: 30,
    fontWeight: '400',
    lineHeight: 37,
    textAlign: 'center',
  },
  headingBold: {
    fontWeight: '700',
    color: Palette.text,
  },
  subtitle: {
    color: Palette.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  form: {
    gap: 12,
  },
  googleBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(110, 90, 150, 0.2)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    height: 56,
    justifyContent: 'center',
    marginTop: -4,
  },
  googleBtnText: {
    color: Palette.text,
    fontSize: 15,
    fontWeight: '600',
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
  registerLink: {
    color: Palette.text,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});