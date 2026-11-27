// SRS4-03 (PIC B — Annis): grafik keuangan denda dengan filter Hari Ini / Minggu Ini / Bulan Ini.
// Batang bertumpuk: magenta = lunas, lilac = belum bayar, hitam = batal/kedaluwarsa.
// Batang tumbuh beranimasi saat filter diganti; ketuk batang untuk melihat rinciannya.
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Chip, formatRupiah, GlassCard } from '@/components/ui';
import { Palette } from '@/constants/theme';

import type { BatangDenda, Periode } from './data-dashboard';

const TINGGI = 120;
const OPSI: { nilai: Periode; label: string }[] = [
  { nilai: 'hari', label: 'Hari ini' },
  { nilai: 'minggu', label: 'Minggu ini' },
  { nilai: 'bulan', label: 'Bulan ini' },
];

function Segmen({ tinggi, warna }: { tinggi: number; warna: string }) {
  const kurangiGerak = useReducedMotion();
  const h = useSharedValue(kurangiGerak ? tinggi : 0);
  useEffect(() => {
    h.set(kurangiGerak ? tinggi : withTiming(tinggi, { duration: 500 }));
  }, [tinggi, kurangiGerak, h]);
  const gaya = useAnimatedStyle(() => ({ height: h.get() }));
  return <Animated.View style={[{ backgroundColor: warna }, gaya]} />;
}

export function GrafikDenda({
  periode,
  onPeriode,
  batang,
}: {
  periode: Periode;
  onPeriode: (p: Periode) => void;
  batang: BatangDenda[];
}) {
  const [dipilih, setDipilih] = useState<number | null>(null);
  const maks = Math.max(1, ...batang.map((b) => b.lunas + b.belum + b.batal));
  const totalLunas = batang.reduce((n, b) => n + b.lunas, 0);
  const terpilih = dipilih !== null ? batang[dipilih] : null;

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.chips}>
        {OPSI.map((o) => (
          <Chip
            key={o.nilai}
            label={o.label}
            selected={periode === o.nilai}
            onPress={() => {
              setDipilih(null);
              onPeriode(o.nilai);
            }}
          />
        ))}
      </View>
      <GlassCard style={{ gap: 10 }}>
        <View style={styles.atas}>
          <View>
            <Text style={styles.kecil}>Denda lunas</Text>
            <Text style={styles.total}>{formatRupiah(totalLunas)}</Text>
          </View>
          <View style={styles.tip}>
            {terpilih ? (
              <>
                <Text style={styles.tipJudul}>{terpilih.judul}</Text>
                <Text style={styles.tipTeks}>Lunas {formatRupiah(terpilih.lunas)}</Text>
                <Text style={styles.tipTeks}>
                  Belum {formatRupiah(terpilih.belum)} · Batal {formatRupiah(terpilih.batal)}
                </Text>
              </>
            ) : (
              <Text style={styles.tipTeks}>Ketuk batang{'\n'}untuk rincian</Text>
            )}
          </View>
        </View>

        {/* key=periode: batang dibuat ulang saat filter diganti supaya tumbuh dari nol lagi. */}
        <View key={periode} style={styles.grafik}>
          {batang.map((b, i) => {
            const redup = dipilih !== null && dipilih !== i;
            return (
              <Pressable
                key={b.label}
                onPress={() => setDipilih(dipilih === i ? null : i)}
                accessibilityRole="button"
                accessibilityLabel={`${b.judul}: lunas ${formatRupiah(b.lunas)}, belum ${formatRupiah(b.belum)}, batal ${formatRupiah(b.batal)}`}
                style={[styles.kolom, redup && { opacity: 0.4 }]}>
                {/* column-reverse: anak pertama di dasar batang. */}
                <Segmen tinggi={(b.lunas / maks) * TINGGI} warna={Palette.primary} />
                <Segmen tinggi={(b.belum / maks) * TINGGI} warna={Palette.lilac} />
                <Segmen tinggi={(b.batal / maks) * TINGGI} warna={Palette.ink} />
              </Pressable>
            );
          })}
        </View>
        <View style={styles.label}>
          {batang.map((b) => (
            <Text key={b.label} style={styles.labelTeks}>
              {b.label}
            </Text>
          ))}
        </View>
        <View style={styles.legenda}>
          {[
            ['Lunas', Palette.primary],
            ['Belum bayar', Palette.lilac],
            ['Batal/kedaluwarsa', Palette.ink],
          ].map(([teks, warna]) => (
            <View key={teks} style={styles.legendaItem}>
              <View style={[styles.legendaKotak, { backgroundColor: warna }]} />
              <Text style={styles.legendaTeks}>{teks}</Text>
            </View>
          ))}
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  atas: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  kecil: { color: Palette.textSecondary, fontSize: 12 },
  total: { color: Palette.text, fontSize: 22, fontWeight: '700' },
  tip: { alignItems: 'flex-end', flexShrink: 1, minHeight: 44 },
  tipJudul: { color: Palette.text, fontSize: 11, fontWeight: '700' },
  tipTeks: { color: Palette.textSecondary, fontSize: 11, lineHeight: 15, textAlign: 'right' },
  grafik: { alignItems: 'flex-end', flexDirection: 'row', gap: 7, height: TINGGI },
  kolom: {
    backgroundColor: 'rgba(226, 27, 208, 0.06)',
    borderRadius: 9,
    flex: 1,
    flexDirection: 'column-reverse',
    height: '100%',
    overflow: 'hidden',
  },
  label: { flexDirection: 'row', gap: 7, marginTop: -4 },
  labelTeks: { color: Palette.textMuted, flex: 1, fontSize: 10.5, textAlign: 'center' },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendaItem: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  legendaKotak: { borderRadius: 3, height: 10, width: 10 },
  legendaTeks: { color: Palette.textSecondary, fontSize: 11 },
});
