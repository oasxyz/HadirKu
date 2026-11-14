import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
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

// Pesan untuk kegagalan membaca profil. Dibedakan dari "profil belum ada" agar
// gangguan jaringan tidak dianggap sebagai akun tanpa profil (bisa menimpa data).
const PROFILE_LOAD_ERROR = 'Gagal memuat profil. Periksa koneksi internet lalu coba lagi.';

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
  /** Terisi hanya kalau membaca dokumen profil gagal (mis. offline), bukan saat profil kosong. */
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<{ hasProfile: boolean }>;
  signUp: (params: SignUpParams) => Promise<void>;
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
  completeProfile: (params: { nama: string; nim: string; role: Role }) => Promise<void>;
  reloadProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Membaca dokumen `users/{uid}`. Mengembalikan `null` kalau dokumen memang belum ada,
 * dan melempar error kalau pembacaan gagal (jaringan/rules) agar pemanggil bisa
 * membedakan "belum lengkapi profil" dari "gagal memuat profil".
 */
async function loadProfileFromFirestore(user: FirebaseUser): Promise<User | null> {
  const userDoc = await getDoc(doc(db, COLLECTIONS.users, user.uid));

  if (!userDoc.exists()) {
    return null;
  }

  const data = userDoc.data() as Record<string, any> | undefined;
  return {
    id: user.uid,
    nama: data?.nama ?? '',
    nim: data?.nim ?? '',
    role: data?.role ?? 'praktikan',
    email: user.email ?? data?.email ?? '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pantau perubahan status login Firebase
    const unsubscribeAuth = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      setFirebaseUser(user);

      if (!user) {
        setCurrentUser(null);
        setProfileError(null);
        setLoading(false);
        return;
      }

      try {
        // Profil diambil langsung di callback agar `currentUser` sudah siap sebelum layar pindah.
        setCurrentUser(await loadProfileFromFirestore(user));
        setProfileError(null);
      } catch (error) {
        console.error('Gagal mengambil data user Firestore:', error);
        // Jangan set currentUser ke null: profil mungkin ada tapi gagal dibaca (offline).
        setProfileError(PROFILE_LOAD_ERROR);
      }

      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  async function signIn(email: string, password: string): Promise<{ hasProfile: boolean }> {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const profile = await loadProfileFromFirestore(credential.user);

    setCurrentUser(profile);
    setProfileError(null);
    return { hasProfile: profile !== null };
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

    try {
      // Simpan data profil ke koleksi users di Firestore via setDoc
      await setDoc(doc(db, COLLECTIONS.users, uid), userData);
    } catch (error) {
      // Rollback: akun Auth dibuat lebih dulu, jadi harus dihapus kalau profil gagal
      // disimpan. Kalau tidak, email ini "terpakai" tanpa profil dan user buntu.
      try {
        await deleteUser(cred.user);
      } catch (deleteError) {
        console.error('Gagal menghapus akun Auth saat rollback:', deleteError);
        try {
          await firebaseSignOut(auth);
        } catch {
          // Abaikan: yang penting sesi tidak tertinggal dalam keadaan setengah jadi.
        }
      }
      throw error;
    }

    setCurrentUser({
      id: uid,
      ...userData,
    });
    setProfileError(null);
  }

  async function signInWithGoogle(): Promise<{ isNewUser: boolean }> {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Reset sesi Google di perangkat agar dialog pemilih akun (Account Picker) selalu muncul
    try {
      await GoogleSignin.signOut();
    } catch {
      // Abaikan kalau sebelumnya tidak login via Google
    }

    const response = await GoogleSignin.signIn();
    const idToken = response.data?.idToken;

    if (!idToken) {
      throw new Error('Gagal mendapatkan token autentikasi dari Google');
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);

    // Profil diambil di sini juga supaya state sudah benar sebelum layar pindah.
    const profile = await loadProfileFromFirestore(userCredential.user);
    setCurrentUser(profile);
    setProfileError(null);

    return { isNewUser: profile === null };
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
    await setDoc(doc(db, COLLECTIONS.users, uid), userData);

    setCurrentUser({
      id: uid,
      ...userData,
    });
    setProfileError(null);
  }

  async function reloadProfile() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setCurrentUser(await loadProfileFromFirestore(user));
      setProfileError(null);
    } catch (error) {
      console.error('Gagal mengambil data user Firestore:', error);
      setProfileError(PROFILE_LOAD_ERROR);
    }
  }

  async function signOut() {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Abaikan jika user tidak login via Google
    }
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setProfileError(null);
  }

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        currentUser,
        loading,
        profileError,
        signIn,
        signUp,
        signInWithGoogle,
        completeProfile,
        reloadProfile,
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
