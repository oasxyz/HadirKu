// SRS3-03 (PIC B — Annis): Peta Laboratorium Interaktif.
// Peta digambar Leaflet (src/components/peta/peta-leaflet.tsx, tanpa kunci Google).
// Layar ini mengatur data: marker lab + radius, posisi pengguna realtime, dan panel aktivitas lab.
// Praktikan melihat sesi yang diikutinya; asisten melihat semua sesi di tiap lab (keputusan tim).
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/error-boundary';
import {
  kelompokkanLab,
  namaGrup,
  sedangBerlangsung,
  type GrupLab,
} from '@/components/peta/aktivitas-lab';
import { KartuKondisi } from '@/components/peta/kartu-kondisi';
import { PanelLab } from '@/components/peta/panel-lab';
import PetaLeaflet, { type PinPeta, type RadiusPeta } from '@/components/peta/peta-leaflet';
import { useLabsPeta } from '@/components/peta/use-labs-peta';
import { useLokasiPengguna } from '@/components/peta/use-lokasi-pengguna';
import { useSesiSemuaAsisten } from '@/components/peta/use-sesi-semua-asisten';
import { Chip, GlassCard, RoundButton, TAB_BAR_SPACE } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { useSessions } from '@/hooks/use-sessions';

const INTERVAL_JAM_MS = 30_000;

function useSekarang(): Date {
  const [sekarang, setSekarang] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setSekarang(new Date()), INTERVAL_JAM_MS);
    return () => clearInterval(timer);
  }, []);
  return sekarang;
}

export default function PetaScreen() {
  const currentUser = useCurrentUser();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sekarang = useSekarang();
  const { labs, loading: labsLoading, error: labsError, cobaLagi: muatUlangLab } = useLabsPeta();
  const { sessions: sesiSaya, attendances, error: sesiSayaError } = useSessions();
  const semuaAsisten = useSesiSemuaAsisten();
  // Keputusan tim: asisten melihat semua sesi di tiap lab, praktikan hanya sesi yang diikutinya.
  const isAsisten = currentUser?.role === 'asisten';
  const sessions = isAsisten ? semuaAsisten.sessions : sesiSaya;
  const sessionsError = isAsisten ? semuaAsisten.error : sesiSayaError;
  const lokasi = useLokasiPengguna();
  const [labTerpilih, setLabTerpilih] = useState<string | null>(null);
  const [pusatkan, setPusatkan] = useState(0);

  useEffect(() => {
    if (!currentUser) router.replace('/login' as Href);
  }, [currentUser]);

  const grupLab = useMemo(() => kelompokkanLab(labs), [labs]);
  const grupTerpilih: GrupLab | undefined = grupLab.find((grup) =>
    grup.labs.some((lab) => lab.id === labTerpilih),
  );

  if (!currentUser) return null;

  // Ada praktikum berlangsung di lab ini (dari sesi yang boleh dilihat pengguna).
  function labAktif(labId: string): boolean {
    return sessions.some((session) => session.labId === labId && sedangBerlangsung(session, sekarang));
  }

  // Satu pin per titik koordinat: Lab B/C/D di Gedung E jadi satu pin.
  const pins: PinPeta[] = grupLab.map((grup) => ({
    key: grup.key,
    latitude: grup.latitude,
    longitude: grup.longitude,
    judul: namaGrup(grup),
    aktif: grup.labs.some((lab) => labAktif(lab.id)),
    labId: grup.labs[0].id,
  }));
  const radius: RadiusPeta[] = labs.map((lab) => ({
    id: lab.id,
    latitude: lab.latitude,
    longitude: lab.longitude,
    radiusMeter: lab.radiusMeter,
    aktif: labAktif(lab.id),
  }));

  function keLokasiSaya() {
    if (lokasi.titik) setPusatkan((n) => n + 1);
    else lokasi.cobaLagi();
  }

  const keteranganLokasi =
    lokasi.status === 'ditolak'
      ? 'Jarak tidak tersedia: akses lokasi ditolak.'
      : lokasi.status === 'gps_mati'
        ? 'Jarak tidak tersedia: layanan lokasi nonaktif.'
        : 'Mencari lokasi Anda…';

  // Kartu kondisi di bawah saat tidak ada lab yang dipilih (DESIGN Sprint 3 §6).
  function kartuKondisi() {
    if (labsError || sessionsError) {
      return (
        <KartuKondisi
          judul="Koneksi Jaringan Bermasalah"
          pesan="Tidak dapat menyinkronkan data dengan server. Periksa koneksi internet Anda."
          aksi="Coba Lagi"
          onAksi={muatUlangLab}
        />
      );
    }
    if (lokasi.status === 'ditolak') {
      return (
        <KartuKondisi
          judul="Akses Lokasi Ditolak"
          pesan="HadirKu memerlukan izin akses lokasi untuk menampilkan posisi Anda di peta. Marker laboratorium tetap bisa dipilih."
          aksi="Buka Pengaturan"
          onAksi={() => {
            Linking.openSettings().catch(() => undefined);
          }}
        />
      );
    }
    if (lokasi.status === 'gps_mati') {
      return (
        <KartuKondisi
          judul="Layanan Lokasi Nonaktif"
          pesan="Aktifkan GPS pada perangkat Anda agar posisi Anda terhadap laboratorium dapat ditampilkan."
          aksi="Coba Lagi"
          onAksi={lokasi.cobaLagi}
        />
      );
    }
    if (lokasi.belumTersedia) {
      return (
        <KartuKondisi
          judul="Mencari Titik Koordinat…"
          pesan="Koordinat lokasi perangkat belum tersedia. Pastikan Anda berada di area dengan sinyal GPS memadai."
          aksi="Muat Ulang Lokasi"
          onAksi={lokasi.cobaLagi}
        />
      );
    }
    if (lokasi.status === 'gagal') {
      return (
        <KartuKondisi
          judul="Lokasi Tidak Dapat Diperoleh"
          pesan="Terjadi kendala saat membaca lokasi perangkat. Coba lagi beberapa saat."
          aksi="Coba Lagi"
          onAksi={lokasi.cobaLagi}
        />
      );
    }
    if (!labsLoading && labs.length === 0) {
      return (
        <KartuKondisi
          judul="Belum Ada Data Laboratorium"
          pesan="Lokasi laboratorium belum diatur. Hubungi asisten untuk menambahkannya."
        />
      );
    }
    return null;
  }

  const kondisi = grupTerpilih ? null : kartuKondisi();
  const bawah = insets.bottom + TAB_BAR_SPACE - 8;

  return (
    <View style={styles.screen}>
      <ErrorBoundary fallbackTitle="Peta tidak dapat ditampilkan">
        <PetaLeaflet
          dom={{ scrollEnabled: false, style: StyleSheet.absoluteFill }}
          pins={pins}
          radius={radius}
          pinTerpilih={grupTerpilih?.key ?? null}
          posisiPengguna={lokasi.titik}
          pusatkanKePengguna={pusatkan}
          // Fungsi yang dikirim ke komponen DOM berjalan asinkron (lewat jembatan WebView).
          onPilihLab={async (labId) => setLabTerpilih(labId)}
          // Ketuk area kosong peta: tutup panel.
          onKetukPeta={async () => setLabTerpilih(null)}
        />
      </ErrorBoundary>

      <GlassCard style={[styles.header, { top: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Peta Laboratorium Informatika</Text>
          {labsLoading ? <ActivityIndicator color={Palette.primary} /> : null}
          <RoundButton icon="locate-outline" size={40} onPress={keLokasiSaya} />
          {isAsisten ? (
            <RoundButton
              icon="settings-outline"
              size={40}
              onPress={() => router.push('/kelola-lab' as Href)}
            />
          ) : null}
        </View>
        {labs.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {labs.map((lab) => (
              <Chip
                key={lab.id}
                label={lab.namaLab}
                selected={lab.id === labTerpilih}
                onPress={() => setLabTerpilih(lab.id)}
              />
            ))}
          </ScrollView>
        ) : null}
      </GlassCard>

      {grupTerpilih && labTerpilih ? (
        <View style={[styles.bottom, { bottom: bawah }]}>
          <PanelLab
            grup={grupTerpilih}
            labId={labTerpilih}
            onPilihLab={setLabTerpilih}
            sessions={sessions}
            attendances={attendances}
            role={currentUser.role}
            userId={currentUser.id}
            titikPengguna={lokasi.titik}
            keteranganLokasi={keteranganLokasi}
            sekarang={sekarang}
            maxHeight={height * 0.48}
          />
        </View>
      ) : kondisi ? (
        <GlassCard style={[styles.bottom, { bottom: bawah }]}>{kondisi}</GlassCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    gap: 12,
    left: 14,
    padding: 14,
    position: 'absolute',
    right: 14,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 40,
  },
  title: {
    color: Palette.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  chips: {
    gap: 6,
  },
  bottom: {
    left: 14,
    position: 'absolute',
    right: 14,
  },
});
