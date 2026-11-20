// SRS3-03 (PIC B — Annis): daftar laboratorium realtime untuk tab Peta (hanya baca).
// Bila nanti PIC A menyediakan src/hooks/useLabs.ts, hook ini bisa diganti dengan itu.
import { collection, onSnapshot } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

import { useCurrentUser } from '@/context/auth-context';
import { COLLECTIONS, db } from '@/services/firebase';
import type { Lab } from '@/types';
import { Logger } from '@/utils/logger';

type LabsState = {
  userId: string | null;
  percobaan: number;
  labs: Lab[];
  loading: boolean;
  error: string | null;
};

export function useLabsPeta() {
  const currentUser = useCurrentUser();
  const [percobaan, setPercobaan] = useState(0);
  const [state, setState] = useState<LabsState>({
    userId: null,
    percobaan: 0,
    labs: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(
      collection(db, COLLECTIONS.labs),
      (snapshot) => {
        const labs: Lab[] = [];
        snapshot?.forEach((d) => {
          const data = d.data();
          // Lab tanpa koordinat angka tidak bisa digambar, jadi dilewati.
          if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return;
          labs.push({
            id: d.id,
            namaLab: typeof data.namaLab === 'string' ? data.namaLab : d.id,
            deskripsi: typeof data.deskripsi === 'string' ? data.deskripsi : undefined,
            latitude: data.latitude,
            longitude: data.longitude,
            radiusMeter: typeof data.radiusMeter === 'number' ? data.radiusMeter : 50,
          });
        });
        labs.sort((a, b) => a.namaLab.localeCompare(b.namaLab));
        setState({ userId: currentUser.id, percobaan, labs, loading: false, error: null });
      },
      (error) => {
        Logger.error('FIRESTORE', 'useLabsPeta', error);
        setState({
          userId: currentUser.id,
          percobaan,
          labs: [],
          loading: false,
          error: 'Tidak dapat menyinkronkan data laboratorium. Periksa koneksi internet Anda.',
        });
      },
    );

    return () => unsubscribe();
  }, [currentUser, percobaan]);

  const sinkron = currentUser !== null && state.userId === currentUser.id && state.percobaan === percobaan;

  return {
    labs: sinkron ? state.labs : [],
    loading: currentUser === null ? false : sinkron ? state.loading : true,
    error: sinkron ? state.error : null,
    cobaLagi: () => setPercobaan((n) => n + 1),
  };
}
