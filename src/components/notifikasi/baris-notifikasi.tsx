// SRS4-04 (PIC B — Annis): satu baris notifikasi, dipakai di Profil (3 terbaru) dan /notifikasi.
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { IconName } from '@/components/ui';
import { Palette } from '@/constants/theme';
import type { Notification } from '@/types';
import { ikonNotifikasi } from '@/utils/tujuan-notifikasi';

/** "2026-11-20T14:05:00Z" -> "20 Nov, 21.05" (jam perangkat). */
export function formatWaktuNotif(iso: string): string {
  const waktu = new Date(iso);
  if (Number.isNaN(waktu.getTime())) return '';
  return waktu.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BarisNotifikasi({
  item,
  baru,
  onPress,
}: {
  item: Notification;
  baru: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${baru ? 'Belum dibaca. ' : ''}${item.title}. ${item.body}`}
      accessibilityHint="Membuka halaman terkait"
      style={({ pressed }) => [styles.baris, pressed && { opacity: 0.75 }]}>
      <View style={[styles.ikon, baru && styles.ikonBaru]}>
        <Ionicons name={ikonNotifikasi(item.type) as IconName} size={18} color={baru ? '#FFFFFF' : Palette.text} />
      </View>
      <View style={styles.teks}>
        <View style={styles.atas}>
          <Text style={[styles.judul, baru && styles.judulBaru]} numberOfLines={1}>
            {item.title}
          </Text>
          {baru ? <View style={styles.titik} /> : null}
        </View>
        <Text style={styles.isi} numberOfLines={3}>
          {item.body}
        </Text>
        <Text style={styles.waktu}>{formatWaktuNotif(item.createdAt)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Palette.textMuted} style={{ alignSelf: 'center' }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baris: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: Palette.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  ikon: {
    alignItems: 'center',
    backgroundColor: Palette.lavender,
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  ikonBaru: { backgroundColor: Palette.primary },
  teks: { flex: 1, gap: 2 },
  atas: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  judul: { color: Palette.text, flexShrink: 1, fontSize: 14, fontWeight: '500' },
  judulBaru: { fontWeight: '700' },
  titik: { backgroundColor: Palette.primary, borderRadius: 999, height: 8, width: 8 },
  isi: { color: Palette.textSecondary, fontSize: 12, lineHeight: 17 },
  waktu: { color: Palette.textMuted, fontSize: 11, marginTop: 2 },
});
