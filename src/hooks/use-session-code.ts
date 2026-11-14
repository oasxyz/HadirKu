import { doc, onSnapshot } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

import { useCurrentUser } from '@/context/auth-context';
import { COLLECTIONS, db } from '@/services/firebase';

type SessionCodeState = {
  sessionId: string;
  kode: string | null;
};

/**
 * Kode sesi disimpan di koleksi terpisah `sessionCodes/{sessionId}` yang hanya boleh
 * dibaca asisten pemilik sesi (lihat firestore.rules), supaya praktikan tidak bisa
 * membaca kode dari dokumen sesi.
 */
export function useSessionCode(sessionId: string): string | null {
  const currentUser = useCurrentUser();
  const isAsisten = currentUser?.role === 'asisten';
  const [state, setState] = useState<SessionCodeState | null>(null);

  useEffect(() => {
    if (!isAsisten) return;

    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.sessionCodes, sessionId),
      (snapshot) => {
        const kode = snapshot.exists() ? ((snapshot.data()?.kode as string | undefined) ?? null) : null;
        setState({ sessionId, kode });
      },
      (err) => {
        console.error('Gagal mengambil kode sesi:', err);
        setState({ sessionId, kode: null });
      },
    );

    return () => unsubscribe();
  }, [sessionId, isAsisten]);

  return state?.sessionId === sessionId ? state.kode : null;
}
