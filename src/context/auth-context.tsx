import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from '@react-native-firebase/auth';
import { doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { auth, db, COLLECTIONS } from '@/services/firebase';
import type { Role, User } from '@/types';

interface SignUpParams {
  nama: string;
  nim: string;
  email: string;
  password: string;
  role: Role;
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pantau perubahan status login Firebase
    const unsubscribeAuth = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      setFirebaseUser(user);

      if (user) {
        try {
          // Ambil profil user dari Firestore via getDoc & doc
          const userRef = doc(db, COLLECTIONS.users, user.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const data = userDoc.data() as Record<string, any> | undefined;
            setCurrentUser({
              id: user.uid,
              nama: data?.nama ?? '',
              nim: data?.nim ?? '',
              role: data?.role ?? 'praktikan',
              email: user.email ?? data?.email ?? '',
            });
          } else {
            setCurrentUser(null);
          }
        } catch (error) {
          console.error('Gagal mengambil data user Firestore:', error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }

  async function signUp({ nama, nim, email, password, role }: SignUpParams) {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const uid = cred.user.uid;

    const userData = {
      nama: nama.trim(),
      nim: nim.trim(),
      role,
      email: email.trim().toLowerCase(),
    };

    // Simpan data profil ke koleksi users di Firestore via setDoc
    const userRef = doc(db, COLLECTIONS.users, uid);
    await setDoc(userRef, userData);

    setCurrentUser({
      id: uid,
      ...userData,
    });
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setCurrentUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        currentUser,
        loading,
        signIn,
        signUp,
        signOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
}

/**
 * Hook khusus sesuai spesifikasi SRS001:
 * Digunakan oleh seluruh layar untuk mendapatkan user yang sedang aktif.
 */
export function useCurrentUser(): User | null {
  const { currentUser } = useAuth();
  return currentUser;
}