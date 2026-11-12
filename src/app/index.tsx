// SRS001 (PIC A — Yoas): layar pilih identitas Sprint 1, akan digantikan login Firebase.
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip, GlassCard, ListRow, PrimaryButton, Screen } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import type { Role } from '@/types';

export default function SelectIdentityScreen() {
  const { state, dispatch } = useAppContext();
  const [role, setRole] = useState<Role>('asisten');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const users = state.users.filter((user) => user.role === role);

  function pilihPeran(next: Role) {
    setRole(next);
    setSelectedId(null);
  }

  function lanjut() {
    if (!selectedId) return;
    dispatch({ type: 'SWITCH_USER', userId: selectedId });
    router.replace('/jadwal' as Href);
  }

  return (
    <Screen withTabBar={false}>
      <View style={styles.hero}>
        <View style={[styles.arc, { width: 330, height: 330, top: 6, borderColor: '#CBD0DC' }]} />
        <View style={[styles.arc, { width: 256, height: 256, top: 43, borderColor: '#86D5AC' }]} />
        <View style={[styles.arc, { width: 182, height: 182, top: 80, borderColor: '#F5A97F' }]} />
        <View style={styles.heroBadge}>
          <Ionicons name="school" size={36} color={Palette.primary} />
        </View>
      </View>

      <GlassCard style={styles.sheet}>
        <Text style={styles.heading}>
          Siap Mengikuti{'\n'}Praktikum{'\n'}
          <Text style={styles.headingBold}>Hari Ini!</Text>
        </Text>
        <Text style={styles.subtitle}>
          Pilih peran dan identitasmu untuk masuk ke HadirKu.
        </Text>

        <Text style={styles.label}>Peran</Text>
        <View style={styles.chips}>
          <Chip label="Asisten" selected={role === 'asisten'} onPress={() => pilihPeran('asisten')} />
          <Chip
            label="Praktikan"
            selected={role === 'praktikan'}
            onPress={() => pilihPeran('praktikan')}
          />
        </View>

        <Text style={styles.label}>Identitas</Text>
        <View style={styles.list}>
          {users.map((user, index) => {
            const selected = user.id === selectedId;
            return (
              <ListRow
                key={user.id}
                icon={role === 'asisten' ? 'shield-checkmark-outline' : 'school-outline'}
                tint={index + (role === 'asisten' ? 0 : 2)}
                title={user.nama}
                subtitle={user.nim}
                onPress={() => setSelectedId(user.id)}
                right={
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={26}
                    color={selected ? Palette.primary : '#CFCBD9'}
                  />
                }
              />
            );
          })}
        </View>

        <PrimaryButton label="Lanjut" onPress={lanjut} disabled={!selectedId} />
      </GlassCard>
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
    gap: 14,
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
  },
  subtitle: {
    color: Palette.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  label: {
    color: Palette.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  list: {
    gap: 10,
    marginBottom: 6,
  },
});
