// SRS3-04 (PIC B — Annis): badge status kehadiran dan kategori izin.
// Warna seragam tim: magenta, merah muda, ungu muda, hitam, putih, abu-abu.
// Merah tidak dipakai di sini karena hanya untuk pesan error.
import { StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';
import type { FinalAttendanceStatus } from '@/types';

type Warna = { latar: string; teks: string };

const MAGENTA: Warna = { latar: Palette.primary, teks: '#FFFFFF' };
const MERAH_MUDA: Warna = { latar: Palette.lilac, teks: '#A3148F' };
const UNGU_MUDA: Warna = { latar: Palette.lavender, teks: Palette.ink };
const HITAM: Warna = { latar: Palette.ink, teks: '#FFFFFF' };
const ABU: Warna = { latar: '#B9B5C6', teks: '#FFFFFF' };

/** Warna angka di kotak ringkasan rekap, selaras dengan badge. */
export const WARNA_ANGKA_STATUS: Record<FinalAttendanceStatus, string> = {
  hadir: Palette.primary,
  sakit: '#A3148F',
  izin: '#6B4FA0',
  alpha: Palette.ink,
  belum_hadir: Palette.textMuted,
};

export const LABEL_STATUS_KEHADIRAN: Record<FinalAttendanceStatus, string> = {
  hadir: 'Hadir',
  sakit: 'Sakit',
  izin: 'Izin',
  alpha: 'Alpha',
  belum_hadir: 'Belum Hadir',
};

const WARNA_STATUS: Record<FinalAttendanceStatus, Warna> = {
  hadir: MAGENTA,
  sakit: MERAH_MUDA,
  izin: UNGU_MUDA,
  alpha: HITAM,
  belum_hadir: ABU,
};

function Tag({ label, warna }: { label: string; warna: Warna }) {
  return (
    <View style={[styles.badge, { backgroundColor: warna.latar }]}>
      <Text style={[styles.text, { color: warna.teks }]}>{label}</Text>
    </View>
  );
}

export function StatusKehadiranBadge({ status }: { status: FinalAttendanceStatus }) {
  return <Tag label={LABEL_STATUS_KEHADIRAN[status]} warna={WARNA_STATUS[status]} />;
}

/** Kategori hasil AI yang sudah dinormalisasi (`normalizeLeaveCategory`). */
export function KategoriIzinBadge({ kategori }: { kategori: 'sakit' | 'izin' | null }) {
  if (kategori === 'sakit') return <Tag label="Sakit" warna={MERAH_MUDA} />;
  if (kategori === 'izin') return <Tag label="Izin" warna={UNGU_MUDA} />;
  return <Tag label="Belum terklasifikasi" warna={ABU} />;
}

// Ukuran sama dengan Badge di ui.tsx supaya sejajar dengan badge lain.
const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  text: { fontSize: 10, fontWeight: '700' },
});
