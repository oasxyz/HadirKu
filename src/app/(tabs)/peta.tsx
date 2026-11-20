// SRS3-03 (PIC B — Annis): Peta Laboratorium Interaktif.
// Marker lab + lingkaran radius, posisi pengguna realtime, dan panel aktivitas lab.
// Versi "punya sendiri": praktikan melihat sesi yang diikutinya, asisten melihat sesinya sendiri.
import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import MapView, { Circle, Marker, UrlTile, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/error-boundary';
import { kelompokkanLab, sedangBerlangsung, type GrupLab } from '@/components/peta/aktivitas-lab';
import { KartuKondisi } from '@/components/peta/kartu-kondisi';
import { PanelLab } from '@/components/peta/panel-lab';
import { useLabsPeta } from '@/components/peta/use-labs-peta';
import { useLokasiPengguna } from '@/components/peta/use-lokasi-pengguna';
import { Chip, GlassCard, RoundButton, TAB_BAR_SPACE } from '@/components/ui';
import { useAppConfig } from '@/constants/config';
import { Palette } from '@/constants/theme';
import { useCurrentUser } from '@/context/auth-context';
import { useSessions } from '@/hooks/use-sessions';

// Titik tengah FSM UNDIP, dipakai sebelum data lab termuat.
const PUSAT_AWAL = { latitude: -7.0486, longitude: 110.4411 };
const ZOOM_AREA = { latitudeDelta: 0.004, longitudeDelta: 0.004 };
const ZOOM_DEKAT = { latitudeDelta: 0.0018, longitudeDelta: 0.0018 };
const INTERVAL_JAM_MS = 30_000;
const OSM_TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Tanpa kunci Google Maps yang valid, tile Google kosong: pakai OpenStreetMap.
function kunciGoogleMapsValid(): boolean {
  const kunci = Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
  return typeof kunci === 'string' && kunci.startsWith('AIza');
}

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
  const mapRef = useRef<MapView>(null);
  const sekarang = useSekarang();
  const config = useAppConfig();
  const { labs, loading: labsLoading, error: labsError, cobaLagi: muatUlangLab } = useLabsPeta();
  const { sessions, attendances, error: sessionsError } = useSessions();
  const lokasi = useLokasiPengguna();
  const [labTerpilih, setLabTerpilih] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) router.replace('/login' as Href);
  }, [currentUser]);

  const grupLab = useMemo(() => kelompokkanLab(labs), [labs]);
  const grupTerpilih: GrupLab | undefined = grupLab.find((grup) =>
    grup.labs.some((lab) => lab.id === labTerpilih),
  );
  const pakaiOsm = config.useOsmFallbackTiles || !kunciGoogleMapsValid();

  if (!currentUser) return null;

  // Marker magenta bila ada praktikum yang sedang berlangsung di salah satu lab pada titik itu.
  function grupAktif(grup: GrupLab): boolean {
    return grup.labs.some((lab) =>
      sessions.some((session) => session.labId === lab.id && sedangBerlangsung(session, sekarang)),
    );
  }

  function arahkanKe(latitude: number, longitude: number, zoom = ZOOM_DEKAT) {
    mapRef.current?.animateToRegion({ latitude, longitude, ...zoom }, 500);
  }

  function pilihLab(labId: string) {
    setLabTerpilih(labId);
    const lab = labs.find((item) => item.id === labId);
    if (lab) arahkanKe(lab.latitude, lab.longitude);
  }

  function keLokasiSaya() {
    if (lokasi.titik) {
      arahkanKe(lokasi.titik.latitude, lokasi.titik.longitude);
    } else {
      lokasi.cobaLagi();
    }
  }

  const regionAwal: Region = {
    ...(labs[0] ? { latitude: labs[0].latitude, longitude: labs[0].longitude } : PUSAT_AWAL),
    ...ZOOM_AREA,
  };

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
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={regionAwal}
          mapType={pakaiOsm ? 'none' : 'standard'}
          toolbarEnabled={false}
          showsCompass={false}
          onPress={() => setLabTerpilih(null)}>
          {pakaiOsm ? (
            <UrlTile urlTemplate={OSM_TILE} maximumZ={19} tileSize={256} shouldReplaceMapContent />
          ) : null}

          {labs.map((lab) => {
            const aktif = sessions.some(
              (session) => session.labId === lab.id && sedangBerlangsung(session, sekarang),
            );
            return (
              <Circle
                key={`radius-${lab.id}-${aktif ? 1 : 0}`}
                center={{ latitude: lab.latitude, longitude: lab.longitude }}
                radius={lab.radiusMeter}
                strokeWidth={2}
                strokeColor={aktif ? Palette.primary : 'rgba(23, 21, 28, 0.55)'}
                fillColor={aktif ? 'rgba(226, 27, 208, 0.12)' : 'rgba(23, 21, 28, 0.06)'}
              />
            );
          })}

          {grupLab.map((grup) => {
            const aktif = grupAktif(grup);
            const judul = grup.labs.map((lab) => lab.namaLab).join(', ');
            return (
              <Marker
                // Warna marker kustom di Android baru berubah kalau marker dibuat ulang.
                key={`lab-${grup.key}-${aktif ? 1 : 0}`}
                coordinate={{ latitude: grup.latitude, longitude: grup.longitude }}
                anchor={{ x: 0.5, y: 1 }}
                tracksViewChanges={false}
                accessibilityLabel={`Laboratorium ${judul}`}
                onPress={() => pilihLab(grup.labs[0].id)}>
                <View style={styles.pinWrap}>
                  <View style={[styles.pin, { backgroundColor: aktif ? Palette.primary : Palette.ink }]}>
                    <View style={styles.pinDot} />
                  </View>
                  <View style={[styles.pinTail, { borderTopColor: aktif ? Palette.primary : Palette.ink }]} />
                </View>
              </Marker>
            );
          })}

          {lokasi.titik ? (
            <Marker
              key="pengguna"
              coordinate={lokasi.titik}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              accessibilityLabel="Posisi Anda">
              <View style={styles.userHalo}>
                <View style={styles.userDot} />
              </View>
            </Marker>
          ) : null}
        </MapView>
      </ErrorBoundary>

      <GlassCard style={[styles.header, { top: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Peta Laboratorium Informatika</Text>
          {labsLoading ? <ActivityIndicator color={Palette.primary} /> : null}
          <RoundButton icon="locate-outline" size={40} onPress={keLokasiSaya} />
          {currentUser.role === 'asisten' ? (
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
                onPress={() => pilihLab(lab.id)}
              />
            ))}
          </ScrollView>
        ) : null}
        {pakaiOsm ? <Text style={styles.attribution}>Peta © kontributor OpenStreetMap</Text> : null}
      </GlassCard>

      {grupTerpilih && labTerpilih ? (
        <View style={[styles.bottom, { bottom: bawah }]}>
          <PanelLab
            grup={grupTerpilih}
            labId={labTerpilih}
            onPilihLab={pilihLab}
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
  attribution: {
    color: Palette.textMuted,
    fontSize: 10,
  },
  bottom: {
    left: 14,
    position: 'absolute',
    right: 14,
  },
  pinWrap: {
    alignItems: 'center',
  },
  pin: {
    alignItems: 'center',
    borderColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 3,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  pinDot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  pinTail: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 7,
    borderRightColor: 'transparent',
    borderRightWidth: 7,
    borderTopWidth: 10,
    marginTop: -2,
  },
  userHalo: {
    alignItems: 'center',
    backgroundColor: 'rgba(107, 79, 160, 0.18)',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  userDot: {
    backgroundColor: '#6B4FA0',
    borderColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 3,
    height: 16,
    width: 16,
  },
});
