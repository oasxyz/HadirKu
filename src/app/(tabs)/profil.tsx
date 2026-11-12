// SRS001 (PIC A — Yoas): profil; tombol Ganti Peran diganti logout Firebase.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Badge, ListRow, Screen, TopBar } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';

export default function ProfilScreen() {
  const { state } = useAppContext();
  const currentUser = state.users.find((user) => user.id === state.currentUserId);

  if (!currentUser) {
    return null;
  }

  const isAsisten = currentUser.role === 'asisten';

  return (
    <Screen>
      <TopBar title="Profil" />

      <View style={styles.header}>
        <Avatar nama={currentUser.nama} size={104} />
        <Text style={styles.name}>{currentUser.nama}</Text>
        <Badge label={isAsisten ? 'Asisten Laboratorium' : 'Praktikan'} tone="pink" />
      </View>

      <View style={styles.list}>
        <ListRow icon="card-outline" tint={0} title="NIM" subtitle={currentUser.nim} />
        <ListRow
          icon="mail-outline"
          tint={1}
          title="Email Institusi"
          subtitle={`${currentUser.nim}@univ.ac.id`}
        />
        <ListRow
          icon="information-circle-outline"
          tint={3}
          title="Versi Aplikasi"
          subtitle="1.0.0 (Sprint 1)"
        />
      </View>

      <Pressable
        onPress={() => router.replace('/')}
        style={({ pressed }) => [styles.logout, pressed && { opacity: 0.7 }]}>
        <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
        <Text style={styles.logoutText}>Ganti Peran / Keluar</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  name: {
    color: Palette.text,
    fontSize: 26,
    fontWeight: '600',
  },
  list: {
    gap: 12,
  },
  logout: {
    alignItems: 'center',
    backgroundColor: '#17151C',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    height: 56,
    justifyContent: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
