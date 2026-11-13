import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from '@react-native-firebase/auth';
import { doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { auth, db, COLLECTIONS } from '@/services/firebase';
import type { Role, User } from '@/types';

GoogleSignin.configure({
  webClientId: '621397636275-keaukjep38c5gnel3qhbpqdi6rg562n8.apps.googleusercontent.com',
});

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
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
  completeProfile: (params: {nama: string; nim: string; role: Role}) => Promise<void>;
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

  async function signInWithGoogle(): Promise<{ isNewUser: boolean }> {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Reset sesi Google di perangkat agar dialog pemilih akun (Account Picker) selalu muncul
    try {
      await GoogleSignin.signOut();
    } catch (_) {}

    const response = await GoogleSignin.signIn();
    const idToken = response.data?.idToken;

    if (!idToken) {
      throw new Error('Gagal mendapatkan token autentikasi dari Google');
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const uid = userCredential.user.uid;

    // Cek apakah data user sudah ada di Firestore
    const userRef = doc(db, COLLECTIONS.users, uid);
    const userDoc = await getDoc(userRef);

    return { isNewUser: !userDoc.exists() };
  }

  async function completeProfile({ nama, nim, role }: { nama: string; nim: string; role: Role }) {
    if (!auth.currentUser) {
      throw new Error('Tidak ada akun yang sedang aktif');
    }

    const uid = auth.currentUser.uid;
    const email = auth.currentUser.email ?? '';

    const userData = {
      nama: nama.trim(),
      nim: nim.trim(),
      role,
      email: email.trim().toLowerCase(),
    };

    // Simpan ke Firestore dan perbarui state currentUser
    const userRef = doc(db, COLLECTIONS.users, uid);
    await setDoc(userRef, userData);

    setCurrentUser({
      id: uid,
      ...userData,
    });
  }

  async function signOut() {
    try {
      await GoogleSignin.signOut();
    } catch (_) {
      // Abaikan jika user tidak login via Google
    }
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
        signInWithGoogle,
        completeProfile,
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