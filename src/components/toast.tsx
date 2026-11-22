// Toast: pesan singkat yang melayang di atas layar untuk konfirmasi aksi di dalam aplikasi
// (buka/tutup sesi, simpan lab, keputusan izin, dll.) yang tidak dikirim sebagai push.
//
// Pakai: const { tampilkanToast } = useToast(); tampilkanToast('Sesi ditutup');
//        tampilkanToast('Gagal menyimpan', 'error');
// Provider dipasang sekali di src/app/_layout.tsx.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';

export type JenisToast = 'sukses' | 'info' | 'error';

type IsiToast = { id: number; pesan: string; jenis: JenisToast };

type NilaiToast = {
  tampilkanToast: (pesan: string, jenis?: JenisToast) => void;
};

const DURASI_MS = 3000;

// Gaya ala X/Twitter: kartu abu-abu gelap dengan teks putih. Jenis toast ditandai titik kecil:
// magenta untuk sukses, putih untuk info, merah untuk error.
const WARNA_TITIK: Record<JenisToast, string> = {
  sukses: Palette.primary,
  info: '#FFFFFF',
  error: '#FF6B8A',
};

const KonteksToast = createContext<NilaiToast>({
  tampilkanToast: () => undefined,
});

export function useToast(): NilaiToast {
  return useContext(KonteksToast);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<IsiToast | null>(null);
  const urutanRef = useRef(0);

  const tampilkanToast = useCallback((pesan: string, jenis: JenisToast = 'sukses') => {
    urutanRef.current += 1;
    // Toast baru menggantikan yang lama supaya tidak menumpuk.
    setToast({ id: urutanRef.current, pesan, jenis });
  }, []);

  const tutup = useCallback(() => setToast(null), []);
  const nilai = useMemo(() => ({ tampilkanToast }), [tampilkanToast]);

  return (
    <KonteksToast.Provider value={nilai}>
      {children}
      {toast ? <KartuToast key={toast.id} toast={toast} onTutup={tutup} /> : null}
    </KonteksToast.Provider>
  );
}

function KartuToast({ toast, onTutup }: { toast: IsiToast; onTutup: () => void }) {
  const insets = useSafeAreaInsets();
  // useState (bukan useRef) supaya nilai animasi boleh dibaca saat render (aturan React Compiler).
  const [muncul] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(muncul, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(muncul, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onTutup());
    }, DURASI_MS);
    return () => clearTimeout(timer);
  }, [muncul, onTutup]);

  const translateY = muncul.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wadah, { top: insets.top + 8, opacity: muncul, transform: [{ translateY }] }]}>
      <Pressable
        onPress={onTutup}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityHint="Ketuk untuk menutup"
        style={styles.kartu}>
        <View style={[styles.titik, { backgroundColor: WARNA_TITIK[toast.jenis] }]} />
        <Text style={styles.teks}>{toast.pesan}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wadah: {
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 1000,
    elevation: 1000,
  },
  kartu: {
    alignItems: 'center',
    backgroundColor: '#2A2830',
    borderRadius: 14,
    boxShadow: '0 10px 30px rgba(20, 15, 30, 0.35)',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  titik: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  teks: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
