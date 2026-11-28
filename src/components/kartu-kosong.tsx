// Kartu keadaan kosong berilustrasi bergerak, pengganti EmptyNote polos di layar utama.
// Gayanya sama dengan kartu "Sesi Terdekat": gradasi putih ke lilac, ilustrasi di kanan,
// judul tebal, keterangan, dan tombol aksi opsional (hitam, seperti tombol utama lain).
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { shadow, type IconName } from '@/components/ui';
import { Palette } from '@/constants/theme';

export function KartuKosong({
  judul,
  pesan,
  ilustrasi,
  aksi,
  ringkas = false,
}: {
  judul: string;
  pesan: string;
  ilustrasi: ReactNode;
  aksi?: { label: string; icon?: IconName; onPress: () => void };
  /** Versi pendek (mis. di bawah kalender): latar polos, ilustrasi lebih kecil. */
  ringkas?: boolean;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      style={[styles.kartu, ringkas ? styles.kartuRingkas : styles.kartuGradien]}
      accessible
      accessibilityLabel={`${judul}. ${pesan}`}>
      <View style={styles.teks}>
        <Text style={styles.judul}>{judul}</Text>
        <Text style={styles.pesan}>{pesan}</Text>
        {aksi ? (
          <Pressable
            onPress={aksi.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.tombol, pressed && { transform: [{ scale: 0.97 }] }]}>
            <Ionicons name={aksi.icon ?? 'add'} size={16} color="#FFFFFF" />
            <Text style={styles.tombolTeks}>{aksi.label}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.seni}>{ilustrasi}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  kartu: {
    alignItems: 'flex-end',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 16,
    paddingLeft: 18,
    paddingRight: 10,
    paddingTop: 16,
  },
  kartuGradien: {
    boxShadow: shadow,
    experimental_backgroundImage:
      'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(244, 207, 239, 0.8) 100%)',
  } as object,
  kartuRingkas: {
    alignItems: 'center',
    backgroundColor: '#F7F6FB',
    borderColor: Palette.border,
    borderRadius: 22,
    paddingBottom: 12,
    paddingTop: 12,
  },
  teks: { alignItems: 'flex-start', flex: 1, gap: 4 },
  judul: { color: Palette.text, fontSize: 16, fontWeight: '700' },
  pesan: { color: Palette.textSecondary, fontSize: 12.5, lineHeight: 18 },
  tombol: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  tombolTeks: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  seni: { marginRight: -4 },
});
