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

export function useLeaveRequests() {
  const currentUser = useCurrentUser();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setLeaveRequests([]);
      setLoading(false);
      return;
    }

    const isAsisten = currentUser.role === 'asisten';
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
            status: data.status ?? 'menunggu',
            createdAt: data.createdAt ?? new Date().toISOString(),
            diputuskanOleh: data.diputuskanOleh ?? null,
            diputuskanAt: data.diputuskanAt ?? null,
          });
        });
        setLeaveRequests(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Gagal mengambil data izin Firestore:', err);
        setError('Gagal memuat data pengajuan izin');
        setLoading(false);
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

  return { leaveRequests, loading, error, updateLeaveStatus };
}