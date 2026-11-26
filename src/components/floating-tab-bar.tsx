import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shadow, type IconName } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';

const TAB_META: Record<string, { label: string; icon: IconName }> = {
  jadwal: { label: 'Beranda', icon: 'home-outline' },
  peta: { label: 'Peta', icon: 'map-outline' },
  rekap: { label: 'Rekap', icon: 'stats-chart-outline' },
  catatan: { label: 'Catatan', icon: 'document-text-outline' },
  izin: { label: 'Izin', icon: 'chatbubbles-outline' },
  profil: { label: 'Profil', icon: 'person-outline' },
  // Sprint 4 (SRS4-03): tab Dashboard khusus Aslab.
  dashboard: { label: 'Dashboard', icon: 'grid-outline' },
};

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
};

// Tab aktif berupa pill magenta berlabel; tab lain hanya ikon bulat.
// Sprint 4 (SRS4-03): peran yang boleh melihat tab tertentu. 'asisten' = alias lama 'asprak'.
const TAB_YANG_DISEMBUNYIKAN: Record<string, string[]> = {
  praktikan: ['catatan', 'dashboard'],
  asisten: ['rekap', 'dashboard'],
  asprak: ['rekap', 'dashboard'],
  aslab: ['rekap', 'izin', 'catatan', 'peta'],
};

export function FloatingTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const currentUser = useCurrentUser();
  const role = currentUser?.role ?? 'praktikan';
  const hidden = TAB_YANG_DISEMBUNYIKAN[role] ?? TAB_YANG_DISEMBUNYIKAN.praktikan;
  // Folder tanpa _layout (mis. rekap/index) bernama "rekap/index"; samakan ke nama tab-nya.
  const tabKey = (name: string) => name.replace(/\/index$/, '');
  const activeName = tabKey(state.routes[state.index]?.name ?? '');

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: insets.bottom + 18 }]}>
      <View style={styles.bar}>
        {state.routes
          .filter((route) => TAB_META[tabKey(route.name)] && !hidden.includes(tabKey(route.name)))
          .map((route) => {
            const meta = TAB_META[tabKey(route.name)];
            const active = tabKey(route.name) === activeName;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={meta.label}
                onPress={() => navigation.navigate(route.name)}
                style={[styles.item, active && styles.itemActive]}>
                <Ionicons name={meta.icon} size={18} color={active ? '#FFFFFF' : Palette.text} />
                {active ? <Text style={styles.label}>{meta.label}</Text> : null}
              </Pressable>
            );
          })}
      </View>
    </View>
  );
}

// Sprint 4 (SRS4-03): tombol magenta melayang di atas tab bar praktikan yang
// langsung membuka kamera presensi. Integrasi final (penempatan di tengah tab bar
// dan logika "sesi aktif mana yang dibuka") dilakukan Annis di SRS4-03.
export function FloatingAbsenButton({ onPress, label = 'Absen' }: { onPress: () => void; label?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.absenWrapper, { bottom: insets.bottom + 56 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Buka kamera presensi"
        onPress={onPress}
        style={({ pressed }) => [styles.absenButton, pressed && styles.absenButtonPressed]}>
        <Ionicons name="qr-code" size={24} color="#FFFFFF" />
        <Text style={styles.absenLabel}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  bar: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 999,
    borderWidth: 1,
    boxShadow: '0 14px 34px rgba(90, 70, 130, 0.20)',
    flexDirection: 'row',
    gap: 6,
    padding: 6,
  },
  item: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    boxShadow: shadow,
    flexDirection: 'row',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  itemActive: {
    backgroundColor: Palette.primary,
    gap: 6,
    paddingHorizontal: 15,
    width: 'auto',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  absenWrapper: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  absenButton: {
    alignItems: 'center',
    backgroundColor: Palette.primary,
    borderRadius: 999,
    boxShadow: '0 16px 32px rgba(226, 27, 208, 0.38)',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  absenButtonPressed: {
    opacity: 0.85,
  },
  absenLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});