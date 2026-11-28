// SRS4-03 (PIC B — Annis): lembar dari bawah untuk Dashboard Aslab.
// - LembarAsprak: daftar asprak, yang sedang mengajar di atas (hanya baca).
// Dibuat dengan Modal bawaan supaya tidak menambah paket baru.
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';

import type { BarisAsprak } from './data-dashboard';

function LembarBawah({
  terbuka,
  onTutup,
  judul,
  sub,
  children,
}: {
  terbuka: boolean;
  onTutup: () => void;
  judul: string;
  sub: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={terbuka} transparent animationType="fade" onRequestClose={onTutup} statusBarTranslucent>
      <Pressable style={styles.latar} onPress={onTutup} accessibilityLabel="Tutup" />
      <Animated.View entering={SlideInDown.duration(320)} style={[styles.lembar, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.pegangan} />
        <View style={styles.kepala}>
          <View style={{ flex: 1 }}>
            <Text style={styles.judul}>{judul}</Text>
            <Text style={styles.sub}>{sub}</Text>
          </View>
          <Pressable onPress={onTutup} accessibilityRole="button" accessibilityLabel="Tutup" style={styles.tutup}>
            <Ionicons name="close" size={18} color={Palette.text} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {children}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function Baris({ judul, sub }: { judul: string; sub: string }) {
  return (
    <View style={styles.baris}>
      <Text style={styles.barisJudul} numberOfLines={1}>
        {judul}
      </Text>
      <Text style={styles.barisSub} numberOfLines={2}>
        {sub}
      </Text>
    </View>
  );
}

export function LembarAsprak({
  terbuka,
  onTutup,
  daftar,
}: {
  terbuka: boolean;
  onTutup: () => void;
  daftar: BarisAsprak[];
}) {
  const mengajar = daftar.filter((d) => d.mengajar);
  const lainnya = daftar.filter((d) => !d.mengajar);
  return (
    <LembarBawah
      terbuka={terbuka}
      onTutup={onTutup}
      judul="Asprak"
      sub={`${daftar.length} asprak · ${mengajar.length} sedang mengajar`}>
      {daftar.length === 0 ? <Text style={styles.kosong}>Belum ada akun asprak.</Text> : null}
      {mengajar.length > 0 ? <Text style={styles.blok}>Sedang mengajar</Text> : null}
      {mengajar.map((d) => (
        <Baris key={d.user.id} judul={d.user.nama} sub={d.keterangan} />
      ))}
      {lainnya.length > 0 ? <Text style={styles.blok}>Lainnya</Text> : null}
      {lainnya.map((d) => (
        <Baris key={d.user.id} judul={d.user.nama} sub={d.keterangan} />
      ))}
    </LembarBawah>
  );
}

const styles = StyleSheet.create({
  latar: { backgroundColor: 'rgba(23, 21, 28, 0.32)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  lembar: {
    backgroundColor: '#F7F6FB',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    bottom: 0,
    gap: 10,
    left: 0,
    maxHeight: '80%',
    paddingHorizontal: 18,
    paddingTop: 10,
    position: 'absolute',
    right: 0,
  },
  pegangan: { alignSelf: 'center', backgroundColor: '#D9D3E3', borderRadius: 9, height: 5, width: 42 },
  kepala: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  judul: { color: Palette.text, fontSize: 18, fontWeight: '700' },
  sub: { color: Palette.textSecondary, fontSize: 12, marginTop: 2 },
  tutup: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: Palette.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  blok: { color: Palette.text, fontSize: 14, fontWeight: '700', marginTop: 6 },
  kosong: { color: Palette.textMuted, fontSize: 13 },
  baris: {
    backgroundColor: '#FFFFFF',
    borderColor: Palette.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  barisJudul: { color: Palette.text, fontSize: 14, fontWeight: '700' },
  barisSub: { color: Palette.textMuted, fontSize: 12 },
});
