import { collection, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

import { useCurrentUser } from '@/context/auth-context';
import { db, COLLECTIONS } from '@/services/firebase';
import type { User } from '@/types';

export function usePraktikanList() {
  const currentUser = useCurrentUser();
  const [praktikanList, setPraktikanList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sesuai firestore.rules: Hanya asisten yang berhak membaca daftar semua user praktikan
    if (!currentUser || currentUser.role !== 'asisten') {
      setPraktikanList([]);
      setLoading(false);
      return;
    }

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
        setPraktikanList(users);
        setLoading(false);
      },
      (error) => {
        console.error('Gagal mengambil daftar praktikan:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  return { praktikanList, loading };
}