// SRS4-03 (PIC B — Annis): data realtime Dashboard Aslab (onSnapshot, SRS 5.2).
// Rules: aslab termasuk isAsisten() sehingga boleh membaca users, sessions, attendances,
// fines, dan payments. Lab dibaca lewat useLabs (milik PIC A) tanpa diubah.
import { collection, onSnapshot } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

import { useCurrentUser } from '@/context/auth-context';
import { useLabs } from '@/hooks/use-labs';
import { COLLECTIONS, db } from '@/services/firebase';
import type { Attendance, Fine, FineStatus, Payment, PaymentStatus, Role, Session, User } from '@/types';
import { Logger } from '@/utils/logger';
import { waktuIsoAtauSekarang } from '@/utils/waktu';

type Dokumen = { id: string; data: Record<string, unknown> };

const teks = (v: unknown, cadangan = ''): string => (typeof v === 'string' ? v : cadangan);
const angka = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function keUser({ id, data }: Dokumen): User {
  return {
    id,
    nama: teks(data.nama, '-'),
    nim: teks(data.nim),
    role: teks(data.role, 'praktikan') as Role,
    email: teks(data.email),
    kelas: typeof data.kelas === 'string' ? data.kelas : undefined,
    labIds: Array.isArray(data.labIds) ? data.labIds.filter((x): x is string => typeof x === 'string') : undefined,
  };
}

function keSesi({ id, data }: Dokumen): Session {
  const status = teks(data.status, 'belum_dibuka');
  return {
    id,
    praktikum: teks(data.praktikum),
    labId: typeof data.labId === 'string' ? data.labId : undefined,
    kelasLab: teks(data.kelasLab),
    tanggal: teks(data.tanggal),
    jamMulai: teks(data.jamMulai),
    jamSelesai: teks(data.jamSelesai),
    asistenId: teks(data.asistenId),
    asistenNama: typeof data.asistenNama === 'string' ? data.asistenNama : undefined,
    pesertaIds: Array.isArray(data.pesertaIds) ? data.pesertaIds.filter((x): x is string => typeof x === 'string') : [],
    status: status === 'dibuka' || status === 'ditutup' ? status : 'belum_dibuka',
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
  };
}

function kePresensi({ id, data }: Dokumen): Attendance {
  return {
    id,
    sessionId: teks(data.sessionId),
    userId: teks(data.userId),
    waktuPresensi: waktuIsoAtauSekarang(data.waktuPresensi),
  };
}

const STATUS_DENDA: FineStatus[] = ['pending', 'processing', 'paid', 'cancelled', 'failed', 'expired'];
function keDenda({ id, data }: Dokumen): Fine {
  const status = teks(data.status, 'pending') as FineStatus;
  return {
    id,
    sessionId: teks(data.sessionId),
    userId: teks(data.userId),
    labId: typeof data.labId === 'string' ? data.labId : undefined,
    praktikum: teks(data.praktikum),
    kelasLab: teks(data.kelasLab),
    jumlahMenitTerlambat: angka(data.jumlahMenitTerlambat),
    nominal: angka(data.nominal),
    status: STATUS_DENDA.includes(status) ? status : 'pending',
    createdAt: waktuIsoAtauSekarang(data.createdAt),
  };
}

function kePembayaran({ id, data }: Dokumen): Payment {
  // SRS menulis `transactionStatus`, tipe PM menulis `status`; keduanya diterima.
  const status = teks(data.status, teks(data.transactionStatus, 'pending')) as PaymentStatus;
  return {
    id,
    fineId: teks(data.fineId),
    userId: teks(data.userId),
    nominal: angka(data.nominal),
    midtransOrderId: teks(data.midtransOrderId, id),
    paymentType: typeof data.paymentType === 'string' ? data.paymentType : undefined,
    status,
    createdAt: waktuIsoAtauSekarang(data.createdAt),
    settledAt: data.settledAt ? waktuIsoAtauSekarang(data.settledAt) : null,
  };
}

type Koleksi<T> = { uid: string | null; items: T[]; siap: boolean; gagal: boolean };

/** Langganan satu koleksi penuh. State dicap uid supaya data akun lain tidak ikut tampil. */
function useKoleksi<T>(nama: string, ubah: (d: Dokumen) => T, aktif: boolean, uid: string | null) {
  const [state, setState] = useState<Koleksi<T>>({ uid: null, items: [], siap: false, gagal: false });

  useEffect(() => {
    if (!aktif || !uid) return;
    const unsub = onSnapshot(
      collection(db, nama),
      (snap) => {
        const items: T[] = [];
        snap?.forEach((d) => {
          items.push(ubah({ id: d.id, data: (d.data() ?? {}) as Record<string, unknown> }));
        });
        setState({ uid, items, siap: true, gagal: false });
      },
      (err) => {
        Logger.error('FIRESTORE', `DASHBOARD_${nama.toUpperCase()}`, err);
        setState({ uid, items: [], siap: true, gagal: true });
      },
    );
    return () => unsub();
  }, [nama, ubah, aktif, uid]);

  const cocok = state.uid === uid;
  return { items: cocok ? state.items : [], siap: cocok && state.siap, gagal: cocok && state.gagal };
}

export function useDashboardAslab() {
  const currentUser = useCurrentUser();
  const aktif = currentUser?.role === 'aslab';
  const uid = currentUser?.id ?? null;

  const { labs, loading: labsLoading } = useLabs();
  const users = useKoleksi(COLLECTIONS.users, keUser, aktif, uid);
  const sessions = useKoleksi(COLLECTIONS.sessions, keSesi, aktif, uid);
  const attendances = useKoleksi(COLLECTIONS.attendances, kePresensi, aktif, uid);
  const fines = useKoleksi(COLLECTIONS.fines, keDenda, aktif, uid);
  const payments = useKoleksi(COLLECTIONS.payments, kePembayaran, aktif, uid);

  return {
    labs,
    users: users.items,
    sessions: sessions.items,
    attendances: attendances.items,
    fines: fines.items,
    payments: payments.items,
    // labIds aslab dibaca dari dokumen users miliknya (auth-context belum memuat field ini).
    labIdsSaya: users.items.find((u) => u.id === uid)?.labIds,
    loading: labsLoading || !users.siap || !sessions.siap,
    // Denda/pembayaran gagal dibaca tidak menggagalkan seluruh dashboard.
    gagal: users.gagal || sessions.gagal,
  };
}
