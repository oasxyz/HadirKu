import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppContext } from '@/context/app-context';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';
import type { Role, User } from '@/types';

function groupByRole(users: User[], role: Role) {
  return users.filter((user) => user.role === role);
}

export default function SelectIdentityScreen() {
  const { state, dispatch } = useAppContext();

  function handleSelect(user: User) {
    dispatch({ type: 'SWITCH_USER', userId: user.id });
    router.replace('/jadwal');
  }

  const asisten = groupByRole(state.users, 'asisten');
  const praktikan = groupByRole(state.users, 'praktikan');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={32} color={Palette.primary} />
          </View>
          <Text style={styles.appName}>SI-PRAKTIKUM 2</Text>
          <Text style={styles.subtitle}>PILIH IDENTITAS ANDA</Text>
        </View>

        <Text style={styles.sectionLabel}>ASISTEN LABORATORIUM</Text>
        {asisten.map((user) => (
          <IdentityCard key={user.id} user={user} onPress={() => handleSelect(user)} />
        ))}

        <Text style={[styles.sectionLabel, styles.sectionLabelSpacing]}>
          PRAKTIKAN (MAHASISWA)
        </Text>
        {praktikan.map((user) => (
          <IdentityCard key={user.id} user={user} onPress={() => handleSelect(user)} />
        ))}
      </View>
    </SafeAreaView>
  );
}

function IdentityCard({ user, onPress }: { user: User; onPress: () => void }) {
  const isAsisten = user.role === 'asisten';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={[styles.avatar, isAsisten && styles.avatarAsisten]}>
        <Ionicons
          name={isAsisten ? 'shield-checkmark' : 'school'}
          size={20}
          color={isAsisten ? Palette.primary : Palette.textSecondary}
        />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{user.nama}</Text>
        <Text style={styles.cardNim}>{user.nim}</Text>
      </View>
      <Ionicons name="person-circle-outline" size={22} color={Palette.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  container: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Palette.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  appName: {
    color: Palette.primary,
    fontSize: 26,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: Palette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: Spacing.one,
  },
  sectionLabel: {
    color: Palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.two,
  },
  sectionLabelSpacing: {
    marginTop: Spacing.four,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 14,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.three,
  },
  cardPressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Palette.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAsisten: {
    backgroundColor: Palette.primaryMuted,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    color: Palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  cardNim: {
    color: Palette.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
