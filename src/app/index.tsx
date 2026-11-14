import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GlassCard, PrimaryButton, Screen } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function EntryScreen() {
  const { firebaseUser, currentUser, loading, profileError, reloadProfile } = useAuth();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // Saat gagal memuat profil, jangan pindah layar: tampilkan opsi coba lagi
    // supaya akun yang punya profil tidak dianggap belum melengkapi profil.
    if (loading || profileError) return;

    if (!firebaseUser) {
      router.replace('/login' as Href);
    } else if (!currentUser) {
      // Akun login terdeteksi tapi belum melengkapi profil di Firestore
      router.replace('/lengkapi-profil' as Href);
    } else {
      router.replace('/jadwal' as Href);
    }
  }, [loading, firebaseUser, currentUser, profileError]);

  async function handleRetry() {
    setRetrying(true);
    try {
      await reloadProfile();
    } finally {
      setRetrying(false);
    }
  }

  const showProfileError = !loading && Boolean(profileError);

  return (
    <Screen withTabBar={false}>
      <View style={styles.center}>
        <GlassCard style={styles.card}>
          {showProfileError ? (
            <>
              <Text style={[styles.text, styles.errorText]}>{profileError}</Text>
              <PrimaryButton
                label={retrying ? 'Mencoba…' : 'Coba lagi'}
                onPress={handleRetry}
                disabled={retrying}
              />
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={Palette.primary} />
              <Text style={styles.text}>Memuat…</Text>
            </>
          )}
        </GlassCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 400,
  },
  card: {
    alignItems: 'center',
    borderRadius: 24,
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  text: {
    color: Palette.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: Palette.danger,
    textAlign: 'center',
  },
});
