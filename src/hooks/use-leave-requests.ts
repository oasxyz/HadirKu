import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

import { useCurrentUser } from '@/context/auth-context';
import { db, COLLECTIONS } from '@/services/firebase';
import type { LeaveRequest } from '@/types';
import { waktuIso, waktuIsoAtauSekarang } from '@/utils/waktu';
import { isStafLab } from '@/types';

export function useLeaveRequests() {
  const currentUser = useCurrentUser();
  const [state, setState] = useState<{
    userId: string | null;
    leaveRequests: LeaveRequest[];
    loading: boolean;
    error: string | null;
  }>({
    userId: null,
    leaveRequests: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const isAsisten = isStafLab(currentUser.role);
    const leaveRequestsCol = collection(db, COLLECTIONS.leaveRequests);

    // Sesuai firestore.rules:
    // Asisten membaca seluruh pengajuan izin; Praktikan hanya membaca pengajuan miliknya sendiri
    const q = isAsisten
      ? query(leaveRequestsCol)
      : query(leaveRequestsCol, where('userId', '==', currentUser.id));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: LeaveRequest[] = [];
        snapshot?.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            sessionId: data.sessionId,
            userId: data.userId,
            alasan: data.alasan ?? '',
            kategoriAi: data.kategoriAi ?? null,
            // SRS4-05: undefined = izin lama sebelum Sprint 4 (belum pernah dianalisis).
            sentimenAi:
              data.sentimenAi === 'positif' || data.sentimenAi === 'netral' || data.sentimenAi === 'negatif'
                ? data.sentimenAi
                : data.sentimenAi === null
                  ? null
                  : undefined,
            status: data.status ?? 'menunggu',
            // Sprint 3 menulis serverTimestamp(); diseragamkan ke ISO string.
            createdAt: waktuIsoAtauSekarang(data.createdAt),
            diputuskanOleh: data.diputuskanOleh ?? null,
            diputuskanAt: waktuIso(data.diputuskanAt),
          });
        });
        setState({
          userId: currentUser.id,
          leaveRequests: list,
          loading: false,
          error: null,
        });
      },
      (err) => {
        console.error('Gagal mengambil data izin Firestore:', err);
        setState({
          userId: currentUser.id,
          leaveRequests: [],
          loading: false,
          error: 'Gagal memuat data pengajuan izin',
        });
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  async function updateLeaveStatus(id: string, status: 'diterima' | 'ditolak', asistenNama: string) {
    const ref = doc(db, COLLECTIONS.leaveRequests, id);
    await updateDoc(ref, {
      status,
      diputuskanOleh: asistenNama,
      diputuskanAt: new Date().toISOString(),
    });
  }

  const isSynced = currentUser !== null && state.userId === currentUser.id;
  const leaveRequests = isSynced ? state.leaveRequests : [];
  const loading = currentUser === null ? false : isSynced ? state.loading : true;
  const error = isSynced ? state.error : null;

  return { leaveRequests, loading, error, updateLeaveStatus };
}