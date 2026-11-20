// SRS3-03 (PIC B — Annis): posisi pengguna yang terus diperbarui selama tab Peta aktif.
// Pemantauan GPS dijalankan di useFocusEffect sehingga otomatis berhenti saat pindah tab
// (SRS 3.4, QA #6).
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Titik } from '@/components/peta/aktivitas-lab';
import { Logger } from '@/utils/logger';

export type StatusLokasi =
  | 'memeriksa' // sedang meminta izin / menyalakan pemantauan
  | 'ditolak' // izin lokasi ditolak
  | 'gps_mati' // layanan lokasi perangkat nonaktif
  | 'mencari' // pemantauan berjalan, koordinat belum didapat
  | 'siap' // koordinat tersedia
  | 'gagal'; // error lain dari modul lokasi

// Kalau koordinat pertama tidak datang dalam waktu ini, tampilkan kondisi "belum tersedia".
const BATAS_TUNGGU_MS = 15000;

export function useLokasiPengguna() {
  const [status, setStatus] = useState<StatusLokasi>('memeriksa');
  const [titik, setTitik] = useState<Titik | null>(null);
  const [lewatBatas, setLewatBatas] = useState(false);
  const [percobaan, setPercobaan] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let aktif = true;
      let langganan: Location.LocationSubscription | null = null;
      const timer = setTimeout(() => {
        if (aktif) setLewatBatas(true);
      }, BATAS_TUNGGU_MS);

      async function mulai() {
        // percobaan > 0 berarti pengguna menekan Coba Lagi / Muat Ulang Lokasi.
        if (percobaan > 0) Logger.info('GEO', 'useLokasiPengguna', `Percobaan ulang ke-${percobaan}`);
        try {
          const izin = await Location.requestForegroundPermissionsAsync();
          if (!aktif) return;
          if (izin.status !== 'granted') {
            setStatus('ditolak');
            return;
          }

          const gpsNyala = await Location.hasServicesEnabledAsync();
          if (!aktif) return;
          if (!gpsNyala) {
            setStatus('gps_mati');
            return;
          }

          setStatus((sebelum) => (sebelum === 'siap' ? sebelum : 'mencari'));
          const sub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, distanceInterval: 5, timeInterval: 5000 },
            (lokasi) => {
              if (!aktif) return;
              setTitik({ latitude: lokasi.coords.latitude, longitude: lokasi.coords.longitude });
              setStatus('siap');
              setLewatBatas(false);
            },
            (pesan) => {
              Logger.warn('GEO', 'watchPositionAsync', pesan);
            },
          );
          // Layar sudah ditinggalkan sebelum pemantauan sempat berjalan: langsung hentikan.
          if (!aktif) {
            sub.remove();
            return;
          }
          langganan = sub;
        } catch (error) {
          Logger.error('GEO', 'useLokasiPengguna', error);
          if (aktif) setStatus('gagal');
        }
      }

      mulai();

      return () => {
        aktif = false;
        clearTimeout(timer);
        langganan?.remove();
      };
    }, [percobaan]),
  );

  return {
    status,
    titik,
    // Koordinat belum datang terlalu lama (sinyal GPS lemah di dalam gedung).
    belumTersedia: status === 'mencari' && lewatBatas,
    cobaLagi: () => {
      setStatus('memeriksa');
      setLewatBatas(false);
      setPercobaan((n) => n + 1);
    },
  };
}
