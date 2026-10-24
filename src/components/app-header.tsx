import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Palette, Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';

export function AppHeader() {
  const { state } = useAppContext();
  const pathname = usePathname();
  const currentUser = state.users.find((user) => user.id === state.currentUserId);
  const isAsisten = currentUser?.role === 'asisten';
  // AppHeader renders at the Tabs level, above each tab's own nested stack,
  // so it can't see that stack's history via useNavigation(). Derive "is this
  // a drill-down screen" from the path instead (e.g. /jadwal/s-1).
  const canGoBack = pathname.split('/').filter(Boolean).length > 1;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.row}>
        <View style={styles.left}>
          {canGoBack ? (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
              <Ionicons name="chevron-back" size={20} color={Palette.text} />
            </Pressable>
          ) : null}
          <Text style={styles.title}>SI-PRAKTIKUM 2</Text>
        </View>
        <View style={styles.right}>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={12} color={Palette.primary} />
            <Text style={styles.badgeText}>{isAsisten ? 'ASISTEN' : 'PRAKTIKAN'}</Text>
          </View>
          <Pressable onPress={() => router.replace('/')} hitSlop={8}>
            <Ionicons name="log-out-outline" size={20} color={Palette.textSecondary} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Palette.background,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  left: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  backButton: {
    marginRight: 2,
  },
  title: {
    color: Palette.primary,
    fontSize: 16,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  right: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: Palette.primaryMuted,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: Palette.primary,
    fontSize: 11,
    fontWeight: '700',
  },
});
