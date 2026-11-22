// Chip keterangan di kartu sesi: label kecil abu-abu (Waktu / Tanggal / Tempat) lalu nilainya.
import { StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';

export function ChipInfo({ label, nilai }: { label: string; nilai: string }) {
  return (
    <View style={styles.chip} accessible accessibilityLabel={`${label}: ${nilai}`}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.nilai} numberOfLines={1}>
        {nilai}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: Palette.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    color: Palette.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  nilai: {
    color: Palette.text,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
});
