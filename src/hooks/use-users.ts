import { collection, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

import { useCurrentUser } from '@/context/auth-context';
import { db, COLLECTIONS } from '@/services/firebase';
import type { User } from '@/types';

type PraktikanState = {
  userId: string | null;
  praktikanList: User[];
  loading: boolean;
};

export function usePraktikanList() {
  const currentUser = useCurrentUser();
  const canRead = currentUser?.role === 'asisten';
  const [state, setState] = useState<PraktikanState>({
    userId: null,
    praktikanList: [],
    loading: true,
  });

  useEffect(() => {
    // Sesuai firestore.rules: Hanya asisten yang berhak membaca daftar semua user praktikan.
    // Jangan setState di dalam effect; nilai kosong diturunkan saat return.
    if (!currentUser || currentUser.role !== 'asisten') return;

    const q = query(collection(db, COLLECTIONS.users), where('role', '==', 'praktikan'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const users: User[] = [];
        snapshot?.forEach((doc) => {
          const data = doc.data();
          users.push({
            id: doc.id,
            nama: data.nama ?? '',
            nim: data.nim ?? '',
            role: 'praktikan',
            email: data.email ?? '',
          });
        });
        setState({ userId: currentUser.id, praktikanList: users, loading: false });
      },
      (error) => {
        console.error('Gagal mengambil daftar praktikan:', error);
        setState({ userId: currentUser.id, praktikanList: [], loading: false });
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  const isSynced = canRead && state.userId === currentUser?.id;

  return {
    praktikanList: isSynced ? state.praktikanList : [],
    loading: canRead ? (isSynced ? state.loading : true) : false,
  };
}
