import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';

export default function ProfilScreen() {
  const { state } = useAppContext();
  const currentUser = state.users.find((user) => user.id === state.currentUserId);

  if (!currentUser) {
    return null;
  }

  const isAsisten = currentUser.role === 'asisten';

  function handleGantiPeran() {
    router.replace('/');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.inner}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={Palette.primary} />
          </View>
          <View style={styles.avatarBadge}>
            <Ionicons name="shield-checkmark" size={14} color={Palette.text} />
          </View>
        </View>
        <Text style={styles.name}>{currentUser.nama}</Text>
        <Text style={styles.roleLine}>
          {isAsisten ? 'Asisten Laboratorium' : 'Praktikan'} · {currentUser.nim}
        </Text>

        <Text style={styles.sectionLabel}>PENGATURAN AKUN</Text>
        <View style={styles.card}>
          <Row icon="mail-outline" label="Email Institusi" value={`${currentUser.nim}@univ.ac.id`} />
          <View style={styles.divider} />
          <Row icon="settings-outline" label="Keamanan" trailing="chevron" />
        </View>

        <Pressable
          onPress={handleGantiPeran}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}>
          <Ionicons name="log-out-outline" size={18} color={Palette.danger} />
          <Text style={styles.logoutLabel}>GANTI PERAN / LOGOUT</Text>
        </Pressable>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>INFORMASI SISTEM</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Versi</Text>
            <Text style={styles.infoValue}>1.0.0 (Sprint 1)</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  value,
  trailing,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  trailing?: 'chevron';
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={Palette.textSecondary} style={styles.rowIcon} />
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {trailing === 'chevron' ? (
        <Ionicons name="chevron-forward" size={16} color={Palette.textMuted} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.six,
    alignItems: 'center',
  },
  avatarWrapper: {
    marginBottom: Spacing.three,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: Palette.text,
    fontSize: 20,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  roleLine: {
    color: Palette.textSecondary,
    fontSize: 13,
    marginTop: Spacing.half,
    marginBottom: Spacing.five,
  },
  sectionLabel: {
    alignSelf: 'flex-start',
    color: Palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.two,
  },
  card: {
    width: '100%',
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 14,
    marginBottom: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  rowIcon: {
    width: 20,
  },
  rowLabel: {
    flex: 1,
    color: Palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  rowValue: {
    color: Palette.textSecondary,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
  },
  logoutButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(235, 4, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(235, 4, 0, 0.4)',
    borderRadius: 14,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.four,
  },
  logoutButtonPressed: {
    opacity: 0.7,
  },
  logoutLabel: {
    color: Palette.danger,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoCard: {
    width: '100%',
    backgroundColor: Palette.primaryMuted,
    borderRadius: 14,
    padding: Spacing.three,
  },
  infoLabel: {
    color: Palette.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.two,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoKey: {
    color: Palette.textSecondary,
    fontSize: 13,
  },
  infoValue: {
    color: Palette.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
