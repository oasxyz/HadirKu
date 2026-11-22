// Splash bergerak HadirKu. Menyambung dari splash bawaan HP (latar ungu muda + logo kalender,
// diatur di app.json): setelah lapisan ini tergambar, splash bawaan disembunyikan lalu animasi
// kalender diputar ±2 detik, nama aplikasi muncul, dan lapisan memudar.
// Setelan "Kurangi gerakan": tampil diam sebentar lalu langsung memudar.
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { DURASI_SPLASH_MS, IlustrasiSplash } from '@/components/ilustrasi';
import { Palette } from '@/constants/theme';

const WARNA_LATAR = '#E4DAF1'; // sama dengan backgroundColor splash di app.json
const TAHAN_MS = 450; // jeda setelah animasi selesai sebelum memudar
const PUDAR_MS = 300;

export function SplashHadirKu() {
  const kurangiGerak = useReducedMotion();
  const [siap, setSiap] = useState(false);
  const [selesai, setSelesai] = useState(false);
  const tampil = useSharedValue(1);
  const teks = useSharedValue(0);

  useEffect(() => {
    if (!siap) return;
    const lamaAnimasi = kurangiGerak ? 400 : DURASI_SPLASH_MS;
    // Nama aplikasi muncul menjelang akhir animasi kalender.
    teks.set(kurangiGerak ? 1 : withDelay(lamaAnimasi * 0.8, withTiming(1, { duration: 400 })));
    tampil.set(
      withDelay(
        lamaAnimasi + TAHAN_MS,
        withTiming(0, { duration: PUDAR_MS }, (beres) => {
          if (beres) scheduleOnRN(setSelesai, true);
        }),
      ),
    );
  }, [siap, kurangiGerak, tampil, teks]);

  const gayaLapisan = useAnimatedStyle(() => ({ opacity: tampil.get() }));
  const gayaTeks = useAnimatedStyle(() => ({
    opacity: teks.get(),
    transform: [{ translateY: (1 - teks.get()) * 10 }],
  }));

  if (selesai) return null;

  return (
    <Animated.View
      pointerEvents={siap ? 'none' : 'auto'}
      style={[styles.lapisan, gayaLapisan]}
      onLayout={() => {
        // Splash bawaan disembunyikan setelah lapisan ini tergambar supaya tidak berkedip.
        SplashScreen.hideAsync().finally(() => setSiap(true));
      }}>
      {siap ? (
        <View style={styles.isi}>
          <IlustrasiSplash lebar={240} />
          <Animated.View style={[styles.teks, gayaTeks]}>
            <Text style={styles.merek}>
              Hadir<Text style={styles.merekAksen}>Ku</Text>
            </Text>
            <Text style={styles.slogan}>Aplikasi kehadiran praktikum Informatika</Text>
          </Animated.View>
        </View>
      ) : null}
      <Text style={styles.kaki}>Informatika · Undip</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lapisan: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    alignItems: 'center',
    backgroundColor: WARNA_LATAR,
    justifyContent: 'center',
    zIndex: 2000,
    elevation: 2000,
  },
  isi: {
    alignItems: 'center',
    gap: 14,
  },
  teks: {
    alignItems: 'center',
    gap: 6,
  },
  merek: {
    color: Palette.ink,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  merekAksen: {
    color: Palette.primary,
  },
  slogan: {
    color: Palette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 32,
    textAlign: 'center',
  },
  kaki: {
    bottom: 36,
    color: Palette.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    position: 'absolute',
    textTransform: 'uppercase',
  },
});
