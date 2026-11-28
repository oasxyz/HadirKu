// SRS4-03 (PIC B — Annis): Jadwal Lab Hari Ini. Pilihan lab berupa pengalih rata
// (seperti Hari Ini / Riwayat), isi per lab mengikuti panel lab di tab Peta:
// Sedang berlangsung, Berikutnya, lalu Jadwal hari ini yang ringkas sampai "Lihat semua" diketuk.
import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { shadow } from '@/components/ui';
import { Palette } from '@/constants/theme';
import type { Session } from '@/types';

import { jamTitik, type JadwalLab } from './data-dashboard';

export function Pengalih<T extends string>({
  opsi,
  nilai,
  onPilih,
  gaya,
}: {
  opsi: { nilai: T; label: string }[];
  nilai: T;
  onPilih: (v: T) => void;
  gaya?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.pengalih, gaya]} accessibilityRole="tablist">
      {opsi.map((o) => {
        const aktif = o.nilai === nilai;
        return (
          <Pressable
            key={o.nilai}
            onPress={() => onPilih(o.nilai)}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktif }}
            style={[styles.pengalihItem, aktif && styles.pengalihAktif]}>
            <Text
              style={[styles.pengalihTeks, aktif && styles.pengalihTeksAktif]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BarisSesi({ session, sekarang }: { session: Session; sekarang: Date }) {
  const berlangsung = session.status === 'dibuka';
  const selesai =
    session.status === 'ditutup' || `${String(sekarang.getHours()).padStart(2, '0')}:${String(sekarang.getMinutes()).padStart(2, '0')}` > session.jamSelesai;
  const asprak = session.asistenNama ? ` · ${session.asistenNama}` : '';
  return (
    <View style={styles.baris}>
      <Text style={[styles.jam, selesai && !berlangsung && styles.jamLewat]}>{jamTitik(session.jamMulai)}</Text>
      <View style={[styles.kartu, berlangsung && styles.kartuAktif, selesai && !berlangsung && styles.kartuLewat]}>
        <Text style={[styles.judul, selesai && !berlangsung && { color: Palette.textSecondary }]} numberOfLines={1}>
          {session.praktikum} {session.kelasLab}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {jamTitik(session.jamMulai)}-{jamTitik(session.jamSelesai)}
          {asprak}
        </Text>
      </View>
    </View>
  );
}

export function JadwalLabHariIni({ jadwal, sekarang }: { jadwal: JadwalLab[]; sekarang: Date }) {
  const [labId, setLabId] = useState(jadwal[0]?.lab.id ?? '');
  const [semua, setSemua] = useState(false);
  const isi = jadwal.find((j) => j.lab.id === labId) ?? jadwal[0];

  if (!isi) {
    return (
      <View style={styles.wadah}>
        <Text style={styles.kosong}>Belum ada lab yang kamu kelola.</Text>
      </View>
    );
  }

  const ringkas =
    isi.hariIni.length === 0
      ? ''
      : `${isi.hariIni.length} sesi · ${jamTitik(isi.hariIni[0].jamMulai)}–${jamTitik(
          isi.hariIni.reduce((maks, s) => (s.jamSelesai > maks ? s.jamSelesai : maks), isi.hariIni[0].jamSelesai),
        )}`;

  return (
    <View style={styles.wadah}>
      <Pengalih
        gaya={styles.pengalihDiKartu}
        opsi={jadwal.map((j) => ({ nilai: j.lab.id, label: j.label }))}
        nilai={isi.lab.id}
        onPilih={(v) => {
          setLabId(v);
          setSemua(false);
        }}
      />
      <View style={styles.kepala}>
        <Text style={styles.namaLab} numberOfLines={1}>
          {isi.lab.namaLab}
        </Text>
        <Text style={styles.jumlah}>{isi.hariIni.length === 0 ? 'Kosong' : `${isi.hariIni.length} sesi hari ini`}</Text>
      </View>

      <View style={styles.blok}>
        <Text style={styles.blokJudul}>Sedang berlangsung</Text>
        {isi.berlangsung.length === 0 ? (
          <Text style={styles.kosong}>Tidak ada sesi yang sedang berlangsung.</Text>
        ) : (
          isi.berlangsung.map((s) => <BarisSesi key={s.id} session={s} sekarang={sekarang} />)
        )}
      </View>

      <View style={styles.blok}>
        <Text style={styles.blokJudul}>Berikutnya</Text>
        {isi.berikutnya ? (
          <BarisSesi session={isi.berikutnya} sekarang={sekarang} />
        ) : (
          <Text style={styles.kosong}>Tidak ada sesi berikutnya hari ini.</Text>
        )}
      </View>

      <View style={styles.blok}>
        <View style={styles.blokKepala}>
          <Text style={styles.blokJudul}>Jadwal hari ini</Text>
          {isi.hariIni.length > 0 ? (
            <Pressable
              hitSlop={8}
              accessibilityRole="button"
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setSemua((v) => !v);
              }}>
              <Text style={styles.lihat}>{semua ? 'Sembunyikan' : 'Lihat semua'}</Text>
            </Pressable>
          ) : null}
        </View>
        {isi.hariIni.length === 0 ? (
          <Text style={styles.kosong}>Belum ada jadwal di lab ini hari ini.</Text>
        ) : semua ? (
          isi.hariIni.map((s) => <BarisSesi key={s.id} session={s} sekarang={sekarang} />)
        ) : (
          <Text style={styles.ringkas}>{ringkas}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Kartu putih solid pembungkus Jadwal Lab Hari Ini supaya terpisah dari latar gradien.
  wadah: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    borderWidth: 1,
    boxShadow: shadow,
    gap: 12,
    padding: 16,
  },
  // Di atas kartu putih, pengalih diberi latar abu-lavender supaya tetap terlihat.
  pengalihDiKartu: { backgroundColor: '#F3F1F6', borderColor: '#F3F1F6' },
  pengalih: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  pengalihItem: { alignItems: 'center', borderRadius: 999, flex: 1, paddingHorizontal: 2, paddingVertical: 10 },
  pengalihAktif: { backgroundColor: Palette.ink },
  pengalihTeks: { color: Palette.textSecondary, fontSize: 13, fontWeight: '700' },
  pengalihTeksAktif: { color: '#FFFFFF' },

  kepala: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  namaLab: { color: Palette.text, flex: 1, fontSize: 15, fontWeight: '700' },
  jumlah: { color: Palette.textMuted, fontSize: 12 },

  blok: { borderTopColor: Palette.border, borderTopWidth: 1, gap: 8, paddingTop: 12 },
  blokKepala: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  blokJudul: { color: Palette.text, fontSize: 14, fontWeight: '700' },
  lihat: { color: Palette.primary, fontSize: 12, fontWeight: '700' },
  kosong: { color: Palette.textMuted, fontSize: 13, lineHeight: 19 },
  ringkas: { color: Palette.textSecondary, fontSize: 12, lineHeight: 17 },

  baris: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  jam: { color: Palette.text, fontSize: 13, fontWeight: '600', width: 42 },
  jamLewat: { color: Palette.textMuted, fontWeight: '400' },
  // Di dalam kartu putih: kartu sesi abu-lavender supaya tidak menyatu dengan latarnya.
  kartu: {
    backgroundColor: '#EFECF5',
    borderColor: 'rgba(110, 90, 150, 0.14)',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  kartuAktif: { backgroundColor: '#FBEAF8', borderColor: Palette.primary, borderWidth: 1.5 },
  // Sesi yang sudah selesai: lebih pudar dari kartu biasa.
  kartuLewat: { backgroundColor: '#F6F5F9', borderColor: 'rgba(110, 90, 150, 0.08)' },
  judul: { color: Palette.text, fontSize: 13, fontWeight: '700' },
  sub: { color: Palette.textMuted, fontSize: 11 },
});
