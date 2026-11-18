import { doc, onSnapshot } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';
import { COLLECTIONS, db } from '@/services/firebase';
import type { AppConfig } from '@/types';

export const DEFAULT_APP_CONFIG: AppConfig = {
  enforceMockLocationBlock: true,
  gpsAccuracyBufferMeter: 10,
  useOsmFallbackTiles: false,
  aiTimeoutMs: 10000,
};

/**
 * Hook untuk membaca konfigurasi runtime (Feature Flags) dari Firestore.
 * Jika offline atau dokumen belum ada, otomatis memakai DEFAULT_APP_CONFIG.
 */
export function useAppConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);

  useEffect(() => {
    const configDocRef = doc(db, COLLECTIONS.appConfig, 'runtime');
    const unsubscribe = onSnapshot(
      configDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<AppConfig> | undefined;
          setConfig({
            enforceMockLocationBlock:
              data?.enforceMockLocationBlock ?? DEFAULT_APP_CONFIG.enforceMockLocationBlock,
            gpsAccuracyBufferMeter:
              data?.gpsAccuracyBufferMeter ?? DEFAULT_APP_CONFIG.gpsAccuracyBufferMeter,
            useOsmFallbackTiles:
              data?.useOsmFallbackTiles ?? DEFAULT_APP_CONFIG.useOsmFallbackTiles,
            aiTimeoutMs: data?.aiTimeoutMs ?? DEFAULT_APP_CONFIG.aiTimeoutMs,
          });
        }
      },
      () => {
        setConfig(DEFAULT_APP_CONFIG);
      }
    );

    return () => unsubscribe();
  }, []);

  return config;
}