import { collection, doc, onSnapshot, updateDoc } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

import { db, COLLECTIONS } from '@/services/firebase';
import type { LeaveRequest } from '@/types';

export function useLeaveRequests() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = collection(db, COLLECTIONS.leaveRequests);
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
  }, []);

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