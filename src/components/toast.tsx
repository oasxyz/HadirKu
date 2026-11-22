// Toast: pesan singkat yang melayang di atas layar untuk konfirmasi aksi di dalam aplikasi
// (buka/tutup sesi, simpan lab, keputusan izin, dll.) yang tidak dikirim sebagai push.
//
// Pakai: const { tampilkanToast } = useToast(); tampilkanToast('Sesi ditutup');
//        tampilkanToast('Gagal menyimpan', 'error');
//        tampilkanToast('Peserta diberi tahu lewat notifikasi.', 'sukses', 'Sesi dibuka');
// Provider dipasang sekali di src/app/_layout.tsx.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';

export type JenisToast = 'sukses' | 'info' | 'error';

type IsiToast = { id: number; pesan: string; jenis: JenisToast; judul: string };

type NilaiToast = {
  /** `judul` opsional; bila kosong memakai judul bawaan sesuai jenis. */
  tampilkanToast: (pesan: string, jenis?: JenisToast, judul?: string) => void;
};

const DURASI_MS = 3000;

// Kartu abu-abu terang bergaris tepi, dengan judul tebal dan isi pesan di bawahnya.
const JUDUL_BAWAAN: Record<JenisToast, string> = {
  sukses: 'Berhasil',
  info: 'Informasi',
  error: 'Terjadi kesalahan',
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

  const tampilkanToast = useCallback(
    (pesan: string, jenis: JenisToast = 'sukses', judul?: string) => {
      urutanRef.current += 1;
      // Toast baru menggantikan yang lama supaya tidak menumpuk.
      setToast({ id: urutanRef.current, pesan, jenis, judul: judul ?? JUDUL_BAWAAN[jenis] });
    },
    [],
  );

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
        <Text style={[styles.judul, toast.jenis === 'error' && styles.judulError]}>{toast.judul}</Text>
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
    backgroundColor: '#ECEAF1',
    borderColor: 'rgba(23, 21, 28, 0.45)',
    borderRadius: 14,
    borderWidth: 1,
    boxShadow: '0 10px 28px rgba(40, 30, 60, 0.16)',
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  judul: {
    color: Palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  judulError: {
    color: Palette.danger,
  },
  teks: {
    color: Palette.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
});
