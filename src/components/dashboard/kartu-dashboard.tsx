// SRS4-03 (PIC B — Annis): kartu-kartu Dashboard Aslab.
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { IlustrasiLab, IlustrasiPapanKlip } from '@/components/ilustrasi';
import { formatRupiah, shadow } from '@/components/ui';
import { Palette } from '@/constants/theme';
import type { Session } from '@/types';
import { formatTanggalSingkat } from '@/utils/format';

import { jamTitik, type RingkasanDenda, type RingkasanLab } from './data-dashboard';
import { IlustrasiTagihan, MiniAsprak, MiniLab, MiniPraktikan } from './ilustrasi-dashboard';

/** Angka yang menghitung naik saat pertama tampil (diam bila "Kurangi gerakan" aktif). */
export function useHitungNaik(target: number, durasi = 900): number {
  const kurangiGerak = useReducedMotion();
  const [nilai, setNilai] = useState(0);

  useEffect(() => {
    if (kurangiGerak) return;
    let frame = 0;
    const mulai = Date.now();
    const dari = 0;
    const langkah = () => {
      const k = Math.min(1, (Date.now() - mulai) / durasi);
      setNilai(Math.round(dari + (target - dari) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) frame = requestAnimationFrame(langkah);
    };
    frame = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(frame);
  }, [target, durasi, kurangiGerak]);

  // "Kurangi gerakan": langsung angka akhir tanpa hitungan.
  return kurangiGerak ? target : nilai;
}

/** Bar progres tipis magenta yang terisi beranimasi. */
export function BarProgres({ persen, lebar = '92%' }: { persen: number; lebar?: `${number}%` }) {
  const kurangiGerak = useReducedMotion();
  const isi = useSharedValue(kurangiGerak ? persen : 0);
  useEffect(() => {
    isi.set(kurangiGerak ? persen : withTiming(persen, { duration: 900 }));
  }, [persen, kurangiGerak, isi]);
  const gaya = useAnimatedStyle(() => ({ width: `${Math.max(isi.get(), 0)}%` }));
  return (
    <View style={[styles.track, { width: lebar }]}>
      <Animated.View style={[styles.fill, gaya]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sedang berlangsung (bisa digeser bila lebih dari satu sesi)
// ---------------------------------------------------------------------------

export function KartuBerlangsung({
  sessions,
  hadir,
  namaLab,
  onTekan,
}: {
  sessions: Session[];
  hadir: (sessionId: string) => number;
  namaLab: (labId?: string) => string;
  onTekan: (session: Session) => void;
}) {
  const [lebar, setLebar] = useState(0);
  const [aktif, setAktif] = useState(0);
  const total = sessions.length;

  return (
    <View style={{ gap: 8 }} onLayout={(e: LayoutChangeEvent) => setLebar(e.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={total > 1}
        onMomentumScrollEnd={(e) => {
          if (lebar > 0) setAktif(Math.round(e.nativeEvent.contentOffset.x / lebar));
        }}>
        {sessions.map((s, i) => {
          const h = hadir(s.id);
          const n = s.pesertaIds.length;
          return (
            <Pressable
              key={s.id}
              onPress={() => onTekan(s)}
              accessibilityRole="button"
              accessibilityLabel={`${s.praktikum} ${s.kelasLab}, hadir ${h} dari ${n}. Ketuk untuk detail.`}
              style={({ pressed }) => [styles.feat, styles.featGradien, { width: lebar || undefined }, pressed && styles.ditekan]}>
              <View style={styles.featTeks}>
                {total > 1 ? (
                  <View style={styles.kotakStatus}>
                    <Text style={styles.kotakStatusTeks}>
                      {i + 1}/{total}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.featJudul} numberOfLines={2}>
                  {s.praktikum} {s.kelasLab}
                </Text>
                <Pil tebal>
                  {jamTitik(s.jamMulai)} - {jamTitik(s.jamSelesai)}
                </Pil>
                <Pil>{formatTanggalSingkat(s.tanggal)}</Pil>
                <Pil>{namaLab(s.labId)}</Pil>
                <Text style={styles.featHadir}>
                  Hadir {h}/{n}
                </Text>
                <BarProgres persen={n === 0 ? 0 : Math.max((h / n) * 100, 4)} />
              </View>
              <View style={styles.featArt}>
                <IlustrasiLab lebar={100} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      {total > 1 ? (
        <View style={styles.titik} accessibilityElementsHidden>
          {sessions.map((s, i) => (
            <View key={s.id} style={[styles.titikItem, i === aktif && styles.titikAktif]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Pil({ children, tebal = false }: { children: ReactNode; tebal?: boolean }) {
  return (
    <View style={styles.pil}>
      <Text style={[styles.pilTeks, tebal && { fontWeight: '700' }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Ringkasan: tiga kartu mini + kartu denda
// ---------------------------------------------------------------------------

function KartuMini({
  angka,
  label,
  keterangan,
  ilustrasi,
  latar,
  onTekan,
}: {
  angka: number;
  label: string;
  keterangan: string;
  ilustrasi: ReactNode;
  latar: string;
  onTekan: () => void;
}) {
  const tampil = useHitungNaik(angka);
  return (
    <Pressable
      onPress={onTekan}
      accessibilityRole="button"
      accessibilityLabel={`${angka} ${label}, ${keterangan}`}
      style={({ pressed }) => [styles.mini, pressed && styles.ditekanKecil]}>
      <View style={[styles.miniArt, { backgroundColor: latar }]}>{ilustrasi}</View>
      <Text style={styles.miniAngka}>{tampil}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniKet} numberOfLines={2}>
        {keterangan}
      </Text>
    </Pressable>
  );
}

export function KartuRingkas({
  ringkas,
  onLab,
  onPraktikan,
  onAsprak,
}: {
  ringkas: RingkasanLab;
  onLab: () => void;
  onPraktikan: () => void;
  onAsprak: () => void;
}) {
  return (
    <View style={styles.baris3}>
      <KartuMini
        angka={ringkas.jumlahLab}
        label="Lab"
        keterangan={`${ringkas.labDipakai} sedang dipakai`}
        ilustrasi={<MiniLab />}
        latar={Palette.lilac}
        onTekan={onLab}
      />
      <KartuMini
        angka={ringkas.jumlahPraktikan}
        label="Praktikan"
        keterangan={ringkas.rentangKelas ? `Kelas ${ringkas.rentangKelas}` : 'Belum ada kelas'}
        ilustrasi={<MiniPraktikan />}
        latar={Palette.lavender}
        onTekan={onPraktikan}
      />
      <KartuMini
        angka={ringkas.jumlahAsprak}
        label="Asprak"
        keterangan={`${ringkas.asprakMengajar} sedang mengajar`}
        ilustrasi={<MiniAsprak />}
        latar={Palette.lilac}
        onTekan={onAsprak}
      />
    </View>
  );
}

export function KartuDenda({ ringkas, onTekan }: { ringkas: RingkasanDenda; onTekan: () => void }) {
  const tampil = useHitungNaik(ringkas.belumNominal);
  return (
    <Pressable
      onPress={onTekan}
      accessibilityRole="button"
      accessibilityLabel={`Denda belum dibayar ${formatRupiah(ringkas.belumNominal)}, ${ringkas.belumJumlah} tagihan. Ketuk untuk melihat pembayaran.`}
      style={({ pressed }) => [styles.denda, pressed && styles.ditekan]}>
      <View style={styles.dendaTeks}>
        <Text style={styles.dendaLabel}>Denda belum dibayar</Text>
        <Text style={styles.dendaAngka}>{formatRupiah(tampil)}</Text>
        <View style={styles.pilBaris}>
          <Pil tebal>{ringkas.belumJumlah} tagihan</Pil>
          <Pil>{ringkas.lunasJumlah} lunas</Pil>
        </View>
        <BarProgres persen={ringkas.persenLunas} />
        <Text style={styles.dendaKet}>{ringkas.persenLunas}% denda sudah lunas</Text>
      </View>
      <View style={styles.dendaArt}>
        <IlustrasiTagihan lebar={92} />
      </View>
    </Pressable>
  );
}

export function KartuRiwayatRingkas({ sesiSelesai, dendaLunas }: { sesiSelesai: number; dendaLunas: number }) {
  return (
    <View style={styles.rk}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rkJudul}>{sesiSelesai} sesi selesai</Text>
        <Text style={styles.rkSub}>dan {dendaLunas} denda lunas minggu ini</Text>
      </View>
      <IlustrasiPapanKlip lebar={78} />
    </View>
  );
}

const styles = StyleSheet.create({
  ditekan: { transform: [{ scale: 0.98 }] },
  ditekanKecil: { transform: [{ scale: 0.96 }] },
  track: { backgroundColor: 'rgba(226, 27, 208, 0.14)', borderRadius: 999, height: 5, overflow: 'hidden' },
  fill: { backgroundColor: Palette.primary, borderRadius: 999, height: 5 },

  feat: {
    alignItems: 'flex-end',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    borderWidth: 1,
    boxShadow: shadow,
    flexDirection: 'row',
    gap: 4,
    padding: 18,
  },
  featGradien: {
    experimental_backgroundImage:
      'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(244, 207, 239, 0.8) 100%)',
  } as object,
  featTeks: { alignItems: 'flex-start', flex: 1, gap: 7 },
  featJudul: { color: Palette.text, fontSize: 20, fontWeight: '600', lineHeight: 25 },
  featHadir: { color: Palette.textMuted, fontSize: 11, marginTop: 2 },
  featArt: { marginRight: -8 },
  kotakStatus: { backgroundColor: Palette.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  kotakStatusTeks: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  pil: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: Palette.border,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pilTeks: { color: Palette.text, fontSize: 12 },
  pilBaris: { flexDirection: 'row', gap: 6 },
  titik: { flexDirection: 'row', gap: 5, justifyContent: 'center' },
  titikItem: { backgroundColor: '#D9D3E3', borderRadius: 9, height: 6, width: 6 },
  titikAktif: { backgroundColor: Palette.primary, width: 16 },

  baris3: { flexDirection: 'row', gap: 8 },
  mini: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 22,
    borderWidth: 1,
    boxShadow: shadow,
    flex: 1,
    gap: 1,
    padding: 10,
    paddingBottom: 12,
  },
  miniArt: { alignItems: 'center', borderRadius: 16, height: 54, justifyContent: 'center', marginBottom: 6 },
  miniAngka: { color: Palette.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  miniLabel: { color: Palette.text, fontSize: 12, fontWeight: '700' },
  miniKet: { color: Palette.textMuted, fontSize: 10.5, lineHeight: 14 },

  denda: {
    alignItems: 'flex-end',
    backgroundColor: Palette.lilac,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    borderWidth: 1,
    boxShadow: shadow,
    flexDirection: 'row',
    gap: 2,
    paddingBottom: 16,
    paddingLeft: 18,
    paddingRight: 8,
    paddingTop: 16,
  },
  dendaTeks: { alignItems: 'flex-start', flex: 1, gap: 7 },
  dendaLabel: { color: Palette.textSecondary, fontSize: 12, fontWeight: '600' },
  dendaAngka: { color: Palette.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  dendaKet: { color: Palette.textSecondary, fontSize: 11 },
  dendaArt: { marginRight: -4 },

  rk: {
    alignItems: 'center',
    backgroundColor: Palette.lavender,
    borderRadius: 24,
    flexDirection: 'row',
    gap: 6,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 8,
  },
  rkJudul: { color: Palette.text, fontSize: 16, fontWeight: '700' },
  rkSub: { color: Palette.textSecondary, fontSize: 12 },
});
