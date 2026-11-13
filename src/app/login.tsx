import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { TextField } from '@/components/text-field';
import { GlassCard, PrimaryButton, Screen } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { getAuthErrorMessage } from '@/utils/auth-error';

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Email dan kata sandi wajib diisi');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await signIn(email, password);
      // Login sukses -> masuk ke beranda jadwal
      router.replace('/jadwal' as Href);
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen withTabBar={false}>
      {/* Hero Visual 3 Busur + Badge */}
      <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}>
        <View style={styles.hero}>
          <View style={[styles.arc, { width: 330, height: 330, top: 6, borderColor: '#DDD6EA' }]} />
          <View style={[styles.arc, { width: 256, height: 256, top: 43, borderColor: '#C5B1E2' }]} />
          <View style={[styles.arc, { width: 182, height: 182, top: 80, borderColor: '#EDA9E6' }]} />
          <View style={styles.heroBadge}>
            <Ionicons name="school" size={36} color={Palette.primary} />
          </View>
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

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

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

          <PrimaryButton
            label={loading ? 'Memproses…' : 'Masuk'}
            onPress={handleLogin}
            disabled={loading}
          />

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
    height: 196,
    overflow: 'hidden',
  },
  arc: {
    borderRadius: 999,
    borderWidth: 26,
    position: 'absolute',
  },
  heroBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 84,
    justifyContent: 'center',
    position: 'absolute',
    top: 102,
    width: 84,
  },
  sheet: {
    borderRadius: 36,
    gap: 16,
    marginTop: -18,
    padding: 24,
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
    color: Palette.primary,
  },
  subtitle: {
    color: Palette.textSecondary,
    fontSize: 13,
    lineHeight: 19,
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
    color: Palette.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});