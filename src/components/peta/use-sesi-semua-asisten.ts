// SRS3-03 (PIC B — Annis): semua sesi di semua lab, khusus asisten, untuk tab Peta.
// Keputusan tim: asisten melihat aktivitas seluruh lab (supaya tahu lab dipakai atau kosong),
// praktikan tetap hanya melihat sesi yang diikutinya. firestore.rules sudah mengizinkan
// asisten membaca semua sesi; praktikan tidak memanggil query ini.
import { collection, onSnapshot } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

import { useCurrentUser } from '@/context/auth-context';
import { COLLECTIONS, db } from '@/services/firebase';
import type { Session } from '@/types';
import { Logger } from '@/utils/logger';
import { isStafLab } from '@/types';

type State = {
  userId: string | null;
  sessions: Session[];
  error: string | null;
};

export function useSesiSemuaAsisten() {
  const currentUser = useCurrentUser();
  const userId = currentUser && isStafLab(currentUser.role) ? currentUser.id : null;
  const [state, setState] = useState<State>({ userId: null, sessions: [], error: null });

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onSnapshot(
      collection(db, COLLECTIONS.sessions),
      (snapshot) => {
        const sessions: Session[] = [];
        snapshot?.forEach((d) => {
          const data = d.data();
          sessions.push({
            id: d.id,
            labId: typeof data.labId === 'string' ? data.labId : undefined,
            praktikum: data.praktikum ?? '',
            kelasLab: data.kelasLab ?? '',
            tanggal: data.tanggal ?? '',
            jamMulai: data.jamMulai ?? '',
            jamSelesai: data.jamSelesai ?? '',
            asistenId: data.asistenId ?? '',
            asistenNama: typeof data.asistenNama === 'string' ? data.asistenNama : undefined,
            pesertaIds: Array.isArray(data.pesertaIds) ? data.pesertaIds : [],
            status: data.status ?? 'belum_dibuka',
          });
        });
        setState({ userId, sessions, error: null });
      },
      (error) => {
        Logger.error('FIRESTORE', 'useSesiSemuaAsisten', error);
        setState({ userId, sessions: [], error: 'Gagal memuat jadwal laboratorium' });
      },
    );
    return () => unsubscribe();
  }, [userId]);

  const sinkron = userId !== null && state.userId === userId;
  return {
    sessions: sinkron ? state.sessions : [],
    error: sinkron ? state.error : null,
  };
}
