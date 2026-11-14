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
import type { Attendance, Coordinates, Session } from '@/types';

type SessionsState = {
  userId: string | null;
  sessions: Session[];
  loading: boolean;
  error: string | null;
};

type AttendancesState = {
  userId: string | null;
  attendances: Attendance[];
};

export function useSessions() {
  const currentUser = useCurrentUser();
  const [sessionState, setSessionState] = useState<SessionsState>({
    userId: null,
    sessions: [],
    loading: true,
    error: null,
  });
  const [attendanceState, setAttendanceState] = useState<AttendancesState>({
    userId: null,
    attendances: [],
  });

  // 1. Query sesi disesuaikan dengan role akun aktif agar lolos aturan security rules
  useEffect(() => {
    // Belum login: jangan setState di dalam effect; nilai kosong diturunkan saat return.
    if (!currentUser) return;

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

          // Field lokasi/nama hasil denormalisasi: dibuang jika bentuknya tidak valid.
          const coords = data.asistenCoords;
          const asistenCoords: Coordinates | null =
            typeof coords?.lat === 'number' && typeof coords?.lng === 'number'
              ? { lat: coords.lat, lng: coords.lng }
              : null;

          list.push({
            id: d.id,
            kelasId: data.kelasId,
            praktikum: data.praktikum ?? '',
            kelasLab: data.kelasLab ?? '',
            tanggal: data.tanggal ?? '',
            jamMulai: data.jamMulai ?? '',
            jamSelesai: data.jamSelesai ?? '',
            asistenId: data.asistenId ?? '',
            asistenNama: typeof data.asistenNama === 'string' ? data.asistenNama : undefined,
            asistenCoords,
            pesertaIds: Array.isArray(data.pesertaIds) ? data.pesertaIds : [],
            kodeSesi: data.kodeSesi ?? null,
            status: data.status ?? 'belum_dibuka',
          });
        });

        setSessionState({
          userId: currentUser.id,
          sessions: list,
          loading: false,
          error: null,
        });
      },
      (err) => {
        console.error('Gagal mengambil sesi Firestore:', err);
        setSessionState({
          userId: currentUser.id,
          sessions: [],
          loading: false,
          error: 'Gagal memuat jadwal praktikum',
        });
      },
    );

    return () => unsubscribeSessions();
  }, [currentUser]);

  // 2. Query presensi realtime disesuaikan dengan role
  useEffect(() => {
    if (!currentUser) return;

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
            jarakMeter: typeof data.jarakMeter === 'number' ? data.jarakMeter : null,
          });
        });
        setAttendanceState({ userId: currentUser.id, attendances: list });
      },
      (err) => {
        console.error('Gagal mengambil data presensi Firestore:', err);
      },
    );

    return () => unsubscribeAttendances();
  }, [currentUser]);

  // Nilai yang ditampilkan hanya milik user aktif, supaya tidak ada data basi saat ganti akun.
  const isSynced = currentUser !== null && sessionState.userId === currentUser.id;
  const sessions = isSynced ? sessionState.sessions : [];
  const loading = currentUser === null ? false : isSynced ? sessionState.loading : true;
  const error = isSynced ? sessionState.error : null;
  const attendances =
    currentUser !== null && attendanceState.userId === currentUser.id
      ? attendanceState.attendances
      : [];

  // CRUD Sesi untuk Asisten
  async function createSession(
    data: Omit<
      Session,
      'id' | 'kodeSesi' | 'status' | 'asistenId' | 'asistenNama' | 'asistenCoords'
    >,
  ) {
    if (!currentUser || currentUser.role !== 'asisten') {
      throw new Error('Hanya asisten yang dapat menambahkan sesi');
    }

    const newDoc = {
      ...data,
      asistenId: currentUser.id,
      // Nama asisten disalin ke dokumen sesi agar praktikan tidak perlu membaca koleksi users.
      asistenNama: currentUser.nama,
      asistenCoords: null,
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
