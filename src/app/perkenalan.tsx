// Halaman perkenalan: tiga halaman singkat tentang HadirKu, muncul sekali saat aplikasi pertama
// kali dibuka (sebelum Login). Bisa digeser, diketuk Lanjut, atau dilewati.
import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  IlustrasiIzinLacak,
  IlustrasiNotifikasi,
  IlustrasiPresensi,
} from '@/components/ilustrasi';
import { Palette } from '@/constants/theme';
import { tandaiPerkenalanDilihat } from '@/utils/perkenalan';

const HALAMAN = [
  {
    judul: 'Presensi cukup dari HP',
    isi: 'Pindai QR dari asisten atau ketik kode 6 digit. HadirKu memastikan kamu berada di dalam radius lab.',
    latar: '#F7EAF5',
    Ilustrasi: IlustrasiPresensi,
  },
  {
    judul: 'Izin tanpa ribet',
    isi: 'Ajukan izin sakit atau keperluan lain, lalu pantau sampai asisten memutuskan.',
    latar: Palette.infoMuted,
    Ilustrasi: IlustrasiIzinLacak,
  },
  {
    judul: 'Jadwal dan rekap selalu terbaru',
    isi: 'Lihat jadwal, peta lab, dan catatan kehadiranmu. Notifikasi datang saat sesi dibuka atau jadwal berubah.',
    latar: '#EEE8F6',
    Ilustrasi: IlustrasiNotifikasi,
  },
] as const;

export default function PerkenalanScreen() {
  const insets = useSafeAreaInsets();
  const [posisi, setPosisi] = useState(0);
  const terakhir = posisi === HALAMAN.length - 1;
  const halaman = HALAMAN[posisi];

  function selesai() {
    tandaiPerkenalanDilihat();
    router.replace('/login' as Href);
  }

  function lanjut() {
    if (terakhir) selesai();
    else setPosisi((p) => p + 1);
  }

  // Geser ke kiri untuk lanjut, ke kanan untuk kembali.
  const geser = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_e, g) => {
          if (g.dx < -50) setPosisi((p) => Math.min(HALAMAN.length - 1, p + 1));
          else if (g.dx > 50) setPosisi((p) => Math.max(0, p - 1));
        },
      }),
    [],
  );

  return (
    <View
      style={[styles.layar, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}
      {...geser.panHandlers}>
      <View style={styles.atas}>
        <Text style={styles.langkah}>
          {posisi + 1} dari {HALAMAN.length}
        </Text>
        {!terakhir ? (
          <Pressable onPress={selesai} hitSlop={10} accessibilityRole="button">
            <Text style={styles.lewati}>Lewati</Text>
          </Pressable>
        ) : null}
      </View>

      {/* key = posisi: ilustrasi dipasang ulang tiap pindah halaman, jadi animasinya diputar lagi. */}
      <Animated.View
        key={posisi}
        entering={FadeIn.duration(250)}
        exiting={FadeOut.duration(150)}
        style={styles.konten}>
        <View style={[styles.panggung, { backgroundColor: halaman.latar }]}>
          <halaman.Ilustrasi lebar={250} />
        </View>
        <Text style={styles.judul}>{halaman.judul}</Text>
        <Text style={styles.isi}>{halaman.isi}</Text>
      </Animated.View>

      <View style={styles.titikBaris} accessibilityLabel={`Halaman ${posisi + 1} dari ${HALAMAN.length}`}>
        {HALAMAN.map((h, i) => (
          <View key={h.judul} style={[styles.titik, i === posisi && styles.titikAktif]} />
        ))}
      </View>

      <Pressable
        onPress={lanjut}
        accessibilityRole="button"
        style={({ pressed }) => [styles.tombol, pressed && { opacity: 0.85 }]}>
        <Text style={styles.tombolTeks}>{terakhir ? 'Mulai' : 'Lanjut'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  layar: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    paddingHorizontal: 22,
  },
  atas: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  langkah: {
    color: Palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  lewati: {
    color: Palette.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  konten: {
    flex: 1,
    gap: 10,
    justifyContent: 'center',
  },
  panggung: {
    alignItems: 'center',
    borderRadius: 32,
    justifyContent: 'center',
    marginBottom: 18,
    paddingVertical: 36,
  },
  judul: {
    color: Palette.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  isi: {
    color: Palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  titikBaris: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
    marginTop: 24,
  },
  titik: {
    backgroundColor: Palette.infoMuted,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  titikAktif: {
    backgroundColor: Palette.primary,
    width: 24,
  },
  tombol: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: 999,
    height: 56,
    justifyContent: 'center',
  },
  tombolTeks: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
