import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';

import { COLLECTIONS, db } from '@/services/firebase';
import type { Lab } from '@/types';
import { Logger } from '@/utils/logger';

export interface UpdateLabInput {
  latitude: number;
  longitude: number;
  radiusMeter: number;
  namaLab?: string;
  deskripsi?: string;
}

export function useLabs() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const labsRef = collection(db, COLLECTIONS.labs);
    const unsubscribe = onSnapshot(
      labsRef,
      (snapshot) => {
        const items: Lab[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            namaLab: data.namaLab ?? docSnap.id,
            deskripsi: data.deskripsi,
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            radiusMeter: Number(data.radiusMeter ?? 50),
            updatedBy: data.updatedBy,
            updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
          });
        });
        // Urutkan berdasarkan ID konsisten
        items.sort((a, b) => a.id.localeCompare(b.id));
        setLabs(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        Logger.error('FIRESTORE', 'USE_LABS_SNAPSHOT', err);
        setError('Gagal memuat data laboratorium.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /**
   * Mengubah koordinat dan radius lab.
   * Aturan bisnis SRS 5.1: Ditolak jika ada sesi yang statusnya sedang 'dibuka' pada lab tersebut.
   */
  async function updateLab(labId: string, input: UpdateLabInput, updatedBy?: string): Promise<void> {
    // 1. Validasi input radius
    if (input.radiusMeter < 20 || input.radiusMeter > 200) {
      throw new Error('Radius presensi harus antara 20 sampai 200 meter.');
    }
    if (isNaN(input.latitude) || isNaN(input.longitude)) {
      throw new Error('Koordinat latitude dan longitude tidak valid.');
    }

    // 2. Periksa sesi yang sedang dibuka di lab ini
    const sessionsRef = collection(db, COLLECTIONS.sessions);
    const activeSessionsQuery = query(
      sessionsRef,
      where('labId', '==', labId),
      where('status', '==', 'dibuka')
    );
    const activeSnap = await getDocs(activeSessionsQuery);
    if (!activeSnap.empty) {
      throw new Error(
        'Lokasi atau radius tidak dapat diubah karena sedang ada praktikum yang dibuka di laboratorium ini.'
      );
    }

    // 3. Update dokumen lab
    const labDocRef = doc(db, COLLECTIONS.labs, labId);
    const updatePayload: Record<string, unknown> = {
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeter: input.radiusMeter,
      updatedAt: serverTimestamp(),
    };
    if (input.namaLab) updatePayload.namaLab = input.namaLab;
    if (input.deskripsi !== undefined) updatePayload.deskripsi = input.deskripsi;
    if (updatedBy) updatePayload.updatedBy = updatedBy;

    await updateDoc(labDocRef, updatePayload);
  }

  return {
    labs,
    loading,
    error,
    updateLab,
  };
}
