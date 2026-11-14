import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

// React Native Firebase hanya berjalan di development build Android/iOS (bukan Expo Go, bukan web).
// Impor berkas ini hanya dari layar atau hook yang dipakai di native.
export const auth = getAuth();
export const db = getFirestore();

// Nama koleksi Firestore: satu tempat agar tidak ada typo antar fitur.
export const COLLECTIONS = {
  users: 'users',
  classes: 'classes',
  sessions: 'sessions',
  // Kode sesi dipisah dari dokumen sesi agar tidak terbaca praktikan (SRS003).
  sessionCodes: 'sessionCodes',
  attendances: 'attendances',
  leaveRequests: 'leaveRequests',
} as const;

// ID dokumen presensi yang deterministik: satu praktikan hanya bisa punya satu dokumen per sesi.
export function attendanceDocId(sessionId: string, userId: string): string {
  return `${sessionId}_${userId}`;
}
