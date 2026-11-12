import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shadow, type IconName } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';

const TAB_META: Record<string, { label: string; icon: IconName }> = {
  jadwal: { label: 'Beranda', icon: 'home-outline' },
  rekap: { label: 'Rekap', icon: 'stats-chart-outline' },
  catatan: { label: 'Catatan', icon: 'document-text-outline' },
  izin: { label: 'Izin', icon: 'chatbubbles-outline' },
  profil: { label: 'Profil', icon: 'person-outline' },
};

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
};

// Tab aktif berupa pill magenta berlabel; tab lain hanya ikon bulat.
export function FloatingTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { state: app } = useAppContext();
  const role = app.users.find((user) => user.id === app.currentUserId)?.role;
  const hidden = role === 'asisten' ? 'catatan' : 'rekap';
  // Folder tanpa _layout (mis. rekap/index) bernama "rekap/index"; samakan ke nama tab-nya.
  const tabKey = (name: string) => name.replace(/\/index$/, '');
  const activeName = tabKey(state.routes[state.index]?.name ?? '');

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: insets.bottom + 18 }]}>
      <View style={styles.bar}>
        {state.routes
          .filter((route) => TAB_META[tabKey(route.name)] && tabKey(route.name) !== hidden)
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
                <Ionicons name={meta.icon} size={19} color={active ? '#FFFFFF' : Palette.text} />
                {active ? <Text style={styles.label}>{meta.label}</Text> : null}
              </Pressable>
            );
          })}
      </View>
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
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 999,
    borderWidth: 1,
    boxShadow: '0 14px 34px rgba(90, 70, 130, 0.20)',
    flexDirection: 'row',
    gap: 8,
    padding: 7,
  },
  item: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    boxShadow: shadow,
    flexDirection: 'row',
    gap: 7,
    height: 48,
    justifyContent: 'center',
    minWidth: 48,
  },
  itemActive: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 18,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
