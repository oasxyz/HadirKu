// SRS3-03 (PIC B — Annis): kartu kondisi perangkat/jaringan di tab Peta.
// Isi pesan mengikuti DESIGN Sprint 3 §6; warnanya mengikuti aturan warna seragam tim
// (tanpa kuning/merah), jadi tidak memakai DeviceStatusCard yang berwarna peringatan.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';

export function KartuKondisi({
  judul,
  pesan,
  aksi,
  onAksi,
}: {
  judul: string;
  pesan: string;
  aksi?: string;
  onAksi?: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{judul}</Text>
      <Text style={styles.message}>{pesan}</Text>
      {aksi && onAksi ? (
        <Pressable
          onPress={onAksi}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>{aksi}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
  },
  title: {
    color: Palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  message: {
    color: Palette.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Palette.ink,
    borderRadius: 999,
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
