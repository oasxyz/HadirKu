import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shadow, type IconName } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { useSesiAbsen } from '@/hooks/use-sesi-absen';

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
// Catatan Kehadiran khusus praktikan, Rekap khusus asprak (sama dengan Sprint 3).
const TAB_YANG_DISEMBUNYIKAN: Record<string, string[]> = {
  praktikan: ['rekap', 'dashboard'],
  asisten: ['catatan', 'dashboard'],
  asprak: ['catatan', 'dashboard'],
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
  // SRS4-03: praktikan mendapat tombol Absen bundar di tengah tab bar.
  const absen = useSesiAbsen();
  const kecil = absen.tampil;
  // Bar praktikan ±325 dp. Di layar sangat sempit (< 360 dp) label tab aktif disembunyikan
  // supaya bar tidak melewati tepi layar.
  const { width: lebarLayar } = useWindowDimensions();
  const tanpaLabel = kecil && lebarLayar < 360;

  const tabs = state.routes
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
          style={[
            styles.item,
            kecil && styles.itemKecil,
            active && !tanpaLabel && styles.itemActive,
            active && kecil && !tanpaLabel && styles.itemActiveKecil,
            active && tanpaLabel && { backgroundColor: Palette.primary },
          ]}>
          <Ionicons name={meta.icon} size={18} color={active ? '#FFFFFF' : Palette.text} />
          {active && !tanpaLabel ? <Text style={styles.label}>{meta.label}</Text> : null}
        </Pressable>
      );
    });

  if (absen.tampil) {
    tabs.splice(
      Math.ceil(tabs.length / 2) - (tabs.length % 2 === 1 ? 1 : 0),
      0,
      <FloatingAbsenButton
        key="absen"
        onPress={absen.buka}
        label={absen.label}
        keterangan={absen.keterangan}
        disabled={!absen.aktif}
        sudah={absen.sesi.status === 'sudah_hadir'}
      />,
    );
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: insets.bottom + 18 }]}>
      <View style={[styles.bar, kecil && styles.barKecil]}>{tabs}</View>
    </View>
  );
}

// Sprint 4 (SRS4-03): tombol magenta bundar di tengah tab bar praktikan yang langsung
// membuka layar presensi (kamera QR + cek lokasi) untuk sesi yang sedang dibuka.
// Abu-abu dan tidak bisa diketuk bila tidak ada sesi aktif (SRS bab 2 poin 8).
export function FloatingAbsenButton({
  onPress,
  label = 'Absen',
  keterangan,
  disabled = false,
  sudah = false,
}: {
  onPress: () => void;
  label?: string;
  keterangan?: string;
  disabled?: boolean;
  sudah?: boolean;
}) {
  return (
    <View style={styles.absenWrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={keterangan ?? 'Buka kamera presensi'}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.absenButton,
          disabled && styles.absenButtonMati,
          pressed && styles.absenButtonPressed,
        ]}>
        <Ionicons name={sudah ? 'checkmark' : 'qr-code'} size={22} color="#FFFFFF" />
      </Pressable>
      <Text style={[styles.absenLabel, disabled && { color: Palette.textMuted }]} numberOfLines={1}>
        {sudah ? 'Sudah' : label}
      </Text>
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
    alignItems: 'center',
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
  // Ukuran ringkas khusus bar praktikan (ada tombol Absen di tengah).
  barKecil: {
    gap: 4,
    padding: 5,
  },
  itemKecil: {
    height: 40,
    width: 40,
  },
  itemActiveKecil: {
    gap: 5,
    paddingHorizontal: 12,
  },
  // Bulatan menyembul ke atas bar; label kecil di bawahnya tetap di dalam bar.
  absenWrapper: {
    alignItems: 'center',
    gap: 1,
    marginHorizontal: 2,
    marginTop: -24,
  },
  absenButton: {
    alignItems: 'center',
    backgroundColor: Palette.primary,
    borderColor: '#EDE7F1',
    borderRadius: 999,
    borderWidth: 4,
    boxShadow: '0 12px 26px rgba(226, 27, 208, 0.38)',
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  absenButtonMati: {
    backgroundColor: Palette.textMuted,
    boxShadow: 'none',
  },
  absenButtonPressed: {
    transform: [{ scale: 0.94 }],
  },
  absenLabel: {
    color: Palette.text,
    fontSize: 10,
    fontWeight: '700',
  },
});