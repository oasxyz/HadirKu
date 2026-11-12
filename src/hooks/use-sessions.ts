import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

import { useCurrentUser } from '@/context/auth-context';
import { db, COLLECTIONS } from '@/services/firebase';
import type { Attendance, Session } from '@/types';

export function useSessions() {
  const currentUser = useCurrentUser();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Dengarkan perubahan koleksi sessions secara realtime
  useEffect(() => {
    const unsubscribeSessions = onSnapshot(
      collection(db, COLLECTIONS.sessions),
      (snapshot) => {
        const list: Session[] = [];
        snapshot?.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            kelasId: data.kelasId,
            praktikum: data.praktikum ?? '',
            kelasLab: data.kelasLab ?? '',
            tanggal: data.tanggal ?? '',
            jamMulai: data.jamMulai ?? '',
            jamSelesai: data.jamSelesai ?? '',
            asistenId: data.asistenId ?? '',
            pesertaIds: Array.isArray(data.pesertaIds) ? data.pesertaIds : [],
            kodeSesi: data.kodeSesi ?? null,
            status: data.status ?? 'belum_dibuka',
          });
        });

        // Filter sesi berdasarkan peran akun yang login (sesuai SRS002)
        const isAsisten = currentUser?.role === 'asisten';
        const filtered = list.filter((session) =>
          isAsisten
            ? session.asistenId === currentUser?.id
            : session.pesertaIds.includes(currentUser?.id ?? ''),
        );

        setSessions(filtered);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Gagal mengambil sesi Firestore:', err);
        setError('Gagal memuat jadwal praktikum');
        setLoading(false);
      },
    );

    return () => unsubscribeSessions();
  }, [currentUser]);

  // 2. Dengarkan perubahan koleksi attendances untuk rekap progres kehadiran
  useEffect(() => {
    const unsubscribeAttendances = onSnapshot(
      collection(db, COLLECTIONS.attendances),
      (snapshot) => {
        const list: Attendance[] = [];
        snapshot?.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            sessionId: data.sessionId,
            userId: data.userId,
            waktuPresensi: data.waktuPresensi,
          });
        });
        setAttendances(list);
      },
      (err) => {
        console.error('Gagal mengambil data presensi Firestore:', err);
      },
    );

    return () => unsubscribeAttendances();
  }, []);

  // CRUD Sesi untuk Asisten
  async function createSession(
    data: Omit<Session, 'id' | 'kodeSesi' | 'status' | 'asistenId'>,
  ) {
    if (!currentUser || currentUser.role !== 'asisten') {
      throw new Error('Hanya asisten yang dapat menambahkan sesi');
    }

    const newDoc = {
      ...data,
      asistenId: currentUser.id,
      kodeSesi: null,
      status: 'belum_dibuka' as const,
    };

    return await addDoc(collection(db, COLLECTIONS.sessions), newDoc);
  }

  async function updateSession(
    sessionId: string,
    data: Partial<Omit<Session, 'id' | 'asistenId'>>,
  ) {
    const sessionRef = doc(db, COLLECTIONS.sessions, sessionId);
    await updateDoc(sessionRef, data);
  }

  async function deleteSession(sessionId: string) {
    const sessionRef = doc(db, COLLECTIONS.sessions, sessionId);
    await deleteDoc(sessionRef);
  }

  return {
    sessions,
    attendances,
    loading,
    error,
    createSession,
    updateSession,
    deleteSession,
  };
}