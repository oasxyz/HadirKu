// Pelacak pengajuan: Diajukan → Diperiksa → Diputuskan (Diterima/Ditolak).
// Dipakai pengajuan izin dan pengajuan pindah kelas.
// Selama `menunggu`, langkah "Diperiksa" sedang berjalan (menunggu asisten).
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';
import type { LeaveStatus } from '@/types';

function formatWaktuSingkat(iso: string | null): string {
  if (!iso) return '';
  const waktu = new Date(iso);
  if (Number.isNaN(waktu.getTime())) return '';
  return waktu.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PelacakPengajuan({
  status,
  createdAt,
  diputuskanAt,
}: {
  status: LeaveStatus;
  createdAt: string;
  diputuskanAt: string | null;
}) {
  const sudahDiputuskan = status !== 'menunggu';
  const ditolak = status === 'ditolak';
  const langkah = [
    { label: 'Diajukan', waktu: formatWaktuSingkat(createdAt), selesai: true, aktif: false },
    {
      label: 'Diperiksa',
      waktu: sudahDiputuskan ? '' : 'Menunggu asisten',
      selesai: sudahDiputuskan,
      aktif: !sudahDiputuskan,
    },
    {
      label: status === 'diterima' ? 'Diterima' : ditolak ? 'Ditolak' : 'Diputuskan',
      waktu: formatWaktuSingkat(diputuskanAt),
      selesai: sudahDiputuskan,
      aktif: false,
    },
  ];

  return (
    <View
      style={styles.lacak}
      accessibilityLabel={`Status pengajuan: ${langkah
        .filter((l) => l.selesai)
        .map((l) => l.label)
        .join(', ')}`}>
      <View style={styles.garis}>
        {langkah.map((l, i) => (
          <View key={l.label} style={styles.segmen}>
            {/* Penghubung kiri/kanan selalu ada (transparan di ujung) supaya titik sejajar label. */}
            <View
              style={[
                styles.penghubung,
                i === 0 && styles.penghubungKosong,
                i > 0 && (l.selesai || l.aktif) ? styles.penghubungAktif : null,
              ]}
            />
            <View
              style={[
                styles.titik,
                l.selesai && styles.titikSelesai,
                l.aktif && styles.titikAktif,
                ditolak && i === 2 && styles.titikDitolak,
              ]}>
              {l.selesai ? (
                <Ionicons name={ditolak && i === 2 ? 'close' : 'checkmark'} size={12} color="#FFFFFF" />
              ) : null}
            </View>
            <View
              style={[
                styles.penghubung,
                i === langkah.length - 1 && styles.penghubungKosong,
                i < langkah.length - 1 && (langkah[i + 1].selesai || langkah[i + 1].aktif)
                  ? styles.penghubungAktif
                  : null,
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.labelBaris}>
        {langkah.map((l) => (
          <View key={l.label} style={styles.labelKolom}>
            <Text style={[styles.label, (l.selesai || l.aktif) && styles.labelAktif]}>{l.label}</Text>
            {l.waktu ? <Text style={styles.waktu}>{l.waktu}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lacak: { gap: 6, marginTop: 4 },
  garis: { flexDirection: 'row', alignItems: 'center' },
  segmen: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  penghubung: { flex: 1, height: 3, borderRadius: 999, backgroundColor: Palette.lavender },
  penghubungAktif: { backgroundColor: Palette.primary },
  penghubungKosong: { backgroundColor: 'transparent' },
  titik: {
    alignItems: 'center',
    backgroundColor: Palette.lavender,
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  titikSelesai: { backgroundColor: Palette.primary },
  titikAktif: { backgroundColor: '#FFFFFF', borderColor: Palette.primary, borderWidth: 2 },
  titikDitolak: { backgroundColor: Palette.ink },
  labelBaris: { flexDirection: 'row' },
  labelKolom: { flex: 1, alignItems: 'center', gap: 1 },
  label: { fontSize: 11, color: Palette.textMuted, fontWeight: '600' },
  labelAktif: { color: Palette.text },
  waktu: { fontSize: 10, color: Palette.textMuted, textAlign: 'center' },
});
