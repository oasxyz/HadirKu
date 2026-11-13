import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
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

  // 1. Query sesi disesuaikan dengan role akun aktif agar lolos aturan security rules
  useEffect(() => {
    // Jika belum login, kosongkan sesi dan matikan loading
    if (!currentUser) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const isAsisten = currentUser.role === 'asisten';
    const sessionsCol = collection(db, COLLECTIONS.sessions);

    // Asisten membaca sesi bimbingannya; Praktikan hanya membaca sesi yang memuat ID-nya di pesertaIds
    const q = isAsisten
      ? query(sessionsCol, where('asistenId', '==', currentUser.id))
      : query(sessionsCol, where('pesertaIds', 'array-contains', currentUser.id));

    const unsubscribeSessions = onSnapshot(
      q,
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

        setSessions(list);
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

  // 2. Query presensi realtime disesuaikan dengan role
  useEffect(() => {
    if (!currentUser) {
      setAttendances([]);
      return;
    }

    const isAsisten = currentUser.role === 'asisten';
    const attendancesCol = collection(db, COLLECTIONS.attendances);

    // Praktikan hanya membaca presensi miliknya sendiri; Asisten membaca seluruh presensi
    const q = isAsisten
      ? query(attendancesCol)
      : query(attendancesCol, where('userId', '==', currentUser.id));

    const unsubscribeAttendances = onSnapshot(
      q,
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
  }, [currentUser]);

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