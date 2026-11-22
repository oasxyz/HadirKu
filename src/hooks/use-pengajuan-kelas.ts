// Pengajuan pindah kelas praktikum: praktikan mengajukan, asisten yang memegangnya memutuskan.
// ID dokumen = uid praktikan, jadi satu praktikan hanya punya satu pengajuan (yang terbaru).
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

import { useCurrentUser } from '@/context/auth-context';
import { COLLECTIONS, db } from '@/services/firebase';
import { kirimNotifikasi, pesanKelasDiputuskan } from '@/services/notifications';
import type { PengajuanKelas } from '@/types';
import { Logger } from '@/utils/logger';

function keWaktu(nilai: unknown): string {
  if (typeof nilai === 'string') return nilai;
  // serverTimestamp / Timestamp dibaca sebagai objek bertoDate().
  const objek = nilai as { toDate?: () => Date } | null;
  return objek?.toDate ? objek.toDate().toISOString() : '';
}

function bacaPengajuan(id: string, data: Record<string, unknown>): PengajuanKelas {
  return {
    id,
    userId: String(data.userId ?? id),
    nama: String(data.nama ?? ''),
    nim: String(data.nim ?? ''),
    kelasLama: typeof data.kelasLama === 'string' ? data.kelasLama : null,
    kelasBaru: String(data.kelasBaru ?? ''),
    alasan: String(data.alasan ?? ''),
    asistenIds: Array.isArray(data.asistenIds) ? (data.asistenIds as string[]) : [],
    status: (data.status as PengajuanKelas['status']) ?? 'menunggu',
    createdAt: keWaktu(data.createdAt),
    diputuskanOleh: typeof data.diputuskanOleh === 'string' ? data.diputuskanOleh : null,
    diputuskanAt: data.diputuskanAt ? keWaktu(data.diputuskanAt) : null,
  };
}

type StatePraktikan = { userId: string | null; pengajuan: PengajuanKelas | null; loading: boolean };

/** Praktikan: pengajuan miliknya (realtime) dan fungsi untuk mengajukan. */
export function usePengajuanKelasSaya() {
  const currentUser = useCurrentUser();
  const aktif = currentUser?.role === 'praktikan';
  const [state, setState] = useState<StatePraktikan>({ userId: null, pengajuan: null, loading: true });

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'praktikan') return;
    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.pengajuanKelas, currentUser.id),
      (snap) => {
        setState({
          userId: currentUser.id,
          pengajuan: snap.exists() ? bacaPengajuan(snap.id, snap.data() ?? {}) : null,
          loading: false,
        });
      },
      (error) => {
        Logger.error('FIRESTORE', 'pengajuanKelasSaya', error);
        setState({ userId: currentUser.id, pengajuan: null, loading: false });
      },
    );
    return () => unsubscribe();
  }, [currentUser]);

  const sinkron = aktif && state.userId === currentUser?.id;

  async function ajukan(params: { kelasBaru: string; alasan: string; asistenIds: string[] }) {
    if (!currentUser) throw new Error('Tidak ada akun yang sedang aktif');
    await setDoc(doc(db, COLLECTIONS.pengajuanKelas, currentUser.id), {
      userId: currentUser.id,
      nama: currentUser.nama,
      nim: currentUser.nim,
      kelasLama: currentUser.kelas ?? null,
      kelasBaru: params.kelasBaru,
      alasan: params.alasan.trim(),
      asistenIds: [...new Set(params.asistenIds)],
      status: 'menunggu',
      createdAt: new Date().toISOString(),
      diputuskanOleh: null,
      diputuskanAt: null,
    });
  }

  return {
    pengajuan: sinkron ? state.pengajuan : null,
    loading: aktif ? (sinkron ? state.loading : true) : false,
    ajukan,
  };
}

type StateAsisten = { userId: string | null; daftar: PengajuanKelas[]; loading: boolean; error: string | null };

/** Asisten: pengajuan dari praktikan yang dipegangnya, terbaru di atas. */
export function usePengajuanKelasMasuk() {
  const currentUser = useCurrentUser();
  const aktif = currentUser?.role === 'asisten';
  const [state, setState] = useState<StateAsisten>({
    userId: null,
    daftar: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'asisten') return;
    const q = query(
      collection(db, COLLECTIONS.pengajuanKelas),
      where('asistenIds', 'array-contains', currentUser.id),
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const daftar: PengajuanKelas[] = [];
        snap?.forEach((d) => {
          daftar.push(bacaPengajuan(d.id, d.data()));
        });
        daftar.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setState({ userId: currentUser.id, daftar, loading: false, error: null });
      },
      (error) => {
        Logger.error('FIRESTORE', 'pengajuanKelasMasuk', error);
        setState({
          userId: currentUser.id,
          daftar: [],
          loading: false,
          error: 'Pengajuan pindah kelas belum bisa dimuat.',
        });
      },
    );
    return () => unsubscribe();
  }, [currentUser]);

  const sinkron = aktif && state.userId === currentUser?.id;

  /** Simpan keputusan; bila diterima, kelas praktikan ikut diganti dalam satu batch. */
  async function putuskan(pengajuan: PengajuanKelas, keputusan: 'diterima' | 'ditolak') {
    if (!currentUser) throw new Error('Tidak ada akun yang sedang aktif');
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTIONS.pengajuanKelas, pengajuan.id), {
      status: keputusan,
      diputuskanOleh: currentUser.nama,
      diputuskanAt: new Date().toISOString(),
    });
    if (keputusan === 'diterima') {
      batch.update(doc(db, COLLECTIONS.users, pengajuan.userId), { kelas: pengajuan.kelasBaru });
    }
    await batch.commit();
    // Notifikasi di latar belakang; kegagalannya tidak membatalkan keputusan.
    void kirimNotifikasi(pesanKelasDiputuskan(pengajuan, keputusan));
  }

  return {
    daftar: sinkron ? state.daftar : [],
    loading: aktif ? (sinkron ? state.loading : true) : false,
    error: sinkron ? state.error : null,
    putuskan,
  };
}
