import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GlassCard, Screen } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function EntryScreen() {
  const { firebaseUser, currentUser, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (firebaseUser) {
        router.replace('/jadwal' as Href);
      } else {
        router.replace('/login' as Href);
      }
    }
  }, [loading, firebaseUser]);

  return (
    <Screen withTabBar={false}>
      <View style={styles.center}>
        <GlassCard style={styles.card}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={styles.text}>Memuat…</Text>
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
});