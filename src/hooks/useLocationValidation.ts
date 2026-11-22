import { doc, onSnapshot } from '@react-native-firebase/firestore';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppConfig } from '@/constants/config';
import { COLLECTIONS, db } from '@/services/firebase';
import type { Coordinates, Lab } from '@/types';
import { Logger } from '@/utils/logger';

/** Fallback lab ID kalau sesi belum punya labId (sesi Sprint 2 lama atau PIC A belum update form). */
const LAB_ID_FALLBACK = 'lab-b';

export type LocationPermissionStatus =
  | 'unknown'
  | 'granted'
  | 'denied'
  | 'services_off'
  | 'timeout';

export interface LocationValidationState {
  /** Koordinat laboratorium yang jadi pusat radius. */
  labCoords: Coordinates | null;
  /** Radius maksimal dalam meter. */
  labRadiusMeter: number | null;
  /** Nama laboratorium (untuk ditampilkan di UI). */
  labName: string | null;
  /** Koordinat perangkat praktikan (hasil GPS). */
  currentCoords: Coordinates | null;
  /** Jarak Haversine ke lab dalam meter (dibulatkan). */
  jarakMeter: number | null;
  /** True kalau perangkat memakai Fake GPS (Android). iOS selalu false. */
  isMocked: boolean;
  /** Status izin lokasi. */
  permissionStatus: LocationPermissionStatus;
  /** Loading saat pengambilan lokasi pertama kali. */
  loading: boolean;
  /** True kalau jarak <= radius + buffer akurasi GPS. */
  isWithinRadius: boolean;
  /** True kalau seluruh syarat lokasi aman (izin, GPS, tidak mock, di dalam radius). */
  canAttend: boolean;
  /** Refetch manual (tombol "Perbarui Lokasi"). */
  refreshLocation: () => Promise<void>;
  /** Simulasi koordinat tepat di lab (khusus testing development). */
  simulateAtLab: () => void;
}

/**
 * Hitung jarak Haversine antara dua koordinat dalam meter.
 * Rumus: 2R * arcsin(sqrt(sin²(Δφ/2) + cos φ₁ · cos φ₂ · sin²(Δλ/2)))
 */
function haversineMeter(a: Coordinates, b: Coordinates): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Hook validasi lokasi hard-blocking untuk halaman presensi.
 *
 * @param labId ID lab dari sesi (session.labId). Null/undefined akan jatuh ke LAB_ID_FALLBACK.
 */
export function useLocationValidation(labId: string | null | undefined): LocationValidationState {
  const config = useAppConfig();

  const [labData, setLabData] = useState<Lab | null>(null);
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  const [isMocked, setIsMocked] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>('unknown');
  const [loading, setLoading] = useState<boolean>(true);

  // Gunakan ref supaya efek refresh tidak men-trigger ulang subscription.
  const fetchingRef = useRef<boolean>(false);

  // 1. Subscribe dokumen lab dari Firestore (real-time)
  useEffect(() => {
    const effectiveLabId = labId ?? LAB_ID_FALLBACK;
    const labRef = doc(db, COLLECTIONS.labs, effectiveLabId);

    const unsubscribe = onSnapshot(
      labRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<Lab>;
          if (
            typeof data.latitude === 'number' &&
            typeof data.longitude === 'number' &&
            typeof data.radiusMeter === 'number'
          ) {
            setLabData({
              id: effectiveLabId,
              namaLab: data.namaLab ?? effectiveLabId,
              latitude: data.latitude,
              longitude: data.longitude,
              radiusMeter: data.radiusMeter,
            });
          }
        } else {
          Logger.warn('GEO', 'LoadLab', `Dokumen lab ${effectiveLabId} tidak ditemukan.`);
        }
      },
      (err) => {
        Logger.error('GEO', 'SubscribeLab', err, { labId: effectiveLabId });
      },
    );

    return () => unsubscribe();
  }, [labId]);

  // 2. Fungsi pengambilan lokasi (dipanggil pertama kali & oleh tombol Perbarui)
  const refreshLocation = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setLoading(true);

      // 2a. Cek layanan lokasi (GPS) aktif
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setPermissionStatus('services_off');
        setCurrentCoords(null);
        setIsMocked(false);
        return;
      }

      // 2b. Minta izin lokasi
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setPermissionStatus('denied');
        setCurrentCoords(null);
        setIsMocked(false);
        return;
      }

      setPermissionStatus('granted');

      // 2c. Ambil posisi GPS (prioritas last known cache, fallback current position)
      let position = await Location.getLastKnownPositionAsync().catch(() => null);

      if (!position) {
        try {
          position = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error('GPS timeout')), 8_000),
            ),
          ]);
        } catch {
          // Timeout saat pencarian sinyal baru, coba last known sekali lagi
          position = await Location.getLastKnownPositionAsync().catch(() => null);
        }
      }

      if (!position) {
        setPermissionStatus('timeout');
        setCurrentCoords(null);
        setIsMocked(false);
        return;
      }

      setCurrentCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });

      // 2d. Deteksi Fake GPS (hanya Android punya field ini)
      const mocked =
        typeof (position as unknown as { mocked?: boolean }).mocked === 'boolean'
          ? ((position as unknown as { mocked?: boolean }).mocked as boolean)
          : false;
      setIsMocked(mocked);
    } catch (err) {
      Logger.warn('GEO', 'RefreshLocation', 'Sinyal lokasi belum siap', { error: String(err) });
      setPermissionStatus('timeout');
      setCurrentCoords(null);
      setIsMocked(false);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // 3. Panggil refreshLocation pertama kali
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshLocation();
  }, [refreshLocation]);

  // 4. Hitung jarak & derivasi state
  const labCoords: Coordinates | null = labData
    ? { lat: labData.latitude, lng: labData.longitude }
    : null;
  const labRadiusMeter = labData?.radiusMeter ?? null;
  const labName = labData?.namaLab ?? null;

  let jarakMeter: number | null = null;
  if (labCoords && currentCoords) {
    jarakMeter = Math.round(haversineMeter(labCoords, currentCoords));
  }

  // Buffer akurasi GPS dari config (default 10m) ditambahkan ke radius saat cek masuk/keluar.
  const effectiveRadius =
    labRadiusMeter !== null ? labRadiusMeter + config.gpsAccuracyBufferMeter : null;
  const isWithinRadius =
    jarakMeter !== null && effectiveRadius !== null && jarakMeter <= effectiveRadius;

  const mockBlocked = config.enforceMockLocationBlock && isMocked;

  const simulateAtLab = useCallback(() => {
    if (labData) {
      setCurrentCoords({ lat: labData.latitude, lng: labData.longitude });
      setIsMocked(false);
      setPermissionStatus('granted');
    }
  }, [labData]);

  const canAttend =
    permissionStatus === 'granted' &&
    !mockBlocked &&
    currentCoords !== null &&
    labCoords !== null &&
    isWithinRadius;

  return {
    labCoords,
    labRadiusMeter,
    labName,
    currentCoords,
    jarakMeter,
    isMocked,
    permissionStatus,
    loading,
    isWithinRadius,
    canAttend,
    refreshLocation,
    simulateAtLab,
  };
}