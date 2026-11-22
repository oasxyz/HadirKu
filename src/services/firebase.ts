import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  writeBatch,
} from '@react-native-firebase/firestore';
import type { Lab } from '@/types';

// React Native Firebase hanya berjalan di development build Android/iOS.
export const auth = getAuth();
export const db = getFirestore();

// Nama koleksi Firestore: satu tempat agar tidak ada typo antar fitur.
export const COLLECTIONS = {
  users: 'users',
  labs: 'labs',
  classes: 'classes',
  sessions: 'sessions',
  // Kode sesi dipisah dari dokumen sesi agar tidak terbaca praktikan.
  sessionCodes: 'sessionCodes',
  sessionSecrets: 'sessionCodes', // Alias Sprint 3 ke koleksi yang sama agar tidak memutus hook Sprint 2
  attendances: 'attendances',
  leaveRequests: 'leaveRequests',
  // Pengajuan pindah kelas praktikum (ID = uid praktikan).
  pengajuanKelas: 'pengajuanKelas',
  notifications: 'notifications',
  appConfig: 'appConfig',
} as const;

// ID dokumen deterministik: satu praktikan hanya bisa punya satu dokumen per sesi.
export function attendanceDocId(sessionId: string, userId: string): string {
  return `${sessionId}_${userId}`;
}

// Alias Sprint 3 untuk dipakai pada attendances maupun leaveRequests.
export function getCompositeId(sessionId: string, userId: string): string {
  return `${sessionId}_${userId}`;
}

// Seeding 4 laboratorium default (Gedung AP, Lab B, Lab C, Lab D) jika koleksi labs masih kosong.
export async function seedInitialLabsIfNeeded(): Promise<void> {
  try {
    const labsRef = collection(db, COLLECTIONS.labs);
    const snapshot = await getDocs(query(labsRef, limit(1)));

    if (snapshot.empty) {
      const batch = writeBatch(db);
      const defaultLabs: Lab[] = [
        {
          id: 'dekanat-fsm',
          namaLab: 'Dekanat FSM',
          deskripsi: 'Gedung Dekanat FSM UNDIP',
          latitude: -7.0490375,
          longitude: 110.441484375,
          radiusMeter: 60,
        },
        {
          id: 'lab-informatika-b',
          namaLab: 'Lab Informatika B',
          deskripsi: 'Gedung E FSM UNDIP Lantai 2',
          latitude: -7.0482375,
          longitude: 110.440765625,
          radiusMeter: 60,
        },
        {
          id: 'lab-informatika-c',
          namaLab: 'Lab Informatika C',
          deskripsi: 'Gedung E FSM UNDIP Lantai 2',
          latitude: -7.0482375,
          longitude: 110.440765625,
          radiusMeter: 60,
        },
        {
          id: 'lab-informatika-d',
          namaLab: 'Lab Informatika D',
          deskripsi: 'Gedung E FSM UNDIP Lantai 2',
          latitude: -7.0482375,
          longitude: 110.440765625,
          radiusMeter: 60,
        },
      ];

      defaultLabs.forEach((lab) => {
        const labDocRef = doc(db, COLLECTIONS.labs, lab.id);
        batch.set(labDocRef, {
          ...lab,
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
    }
  } catch (error) {
    // Graceful degradation: jangan gagalkan render aplikasi jika belum login atau offline
    if (__DEV__) {
      console.warn('[FIRESTORE][seedInitialLabsIfNeeded] Dilewati:', error);
    }
  }
}

// Daftar komponen nama untuk menghasilkan 200 nama praktikan yang realistis dan unik
const NAMA_DEPAN = [
  'Adi', 'Budi', 'Citra', 'Dewi', 'Eka', 'Fajar', 'Gita', 'Hadi', 'Indra', 'Joko',
  'Kartika', 'Lestari', 'Muhammad', 'Nabila', 'Oki', 'Putri', 'Rizky', 'Siti', 'Taufik', 'Wahyu',
] as const;

const NAMA_TENGAH = [
  'Pratama', 'Saputra', 'Wijaya', 'Kusuma', 'Hidayat',
  'Nugroho', 'Santoso', 'Permata', 'Rahmawati', 'Setiawan',
] as const;

/**
 * Seeder 200 data praktikan untuk simulasi riil di koleksi `users`.
 * Aman & Idempotent: mengecek dokumen pertama terlebih dahulu agar tidak menulis ulang jika sudah ada.
 * Catatan: Panggil fungsi ini saat sudah login sebagai akun Asisten.
 */
export async function seedDummyPraktikan200IfNeeded(): Promise<number> {
  try {
    const firstSeedRef = doc(db, COLLECTIONS.users, 'seed-praktikan-001');
    const existingCheck = await getDocs(
      query(collection(db, COLLECTIONS.users), limit(25))
    );

    // Cek apakah dokumen seed sudah pernah dibuat sebelumnya
    const alreadySeeded = existingCheck.docs.some((d) =>
      d.id.startsWith('seed-praktikan-')
    );
    if (alreadySeeded) {
      return 0;
    }

    const batch = writeBatch(db);
    const totalToSeed = 200;

    for (let i = 1; i <= totalToSeed; i++) {
      const numStr = String(i).padStart(3, '0');
      const docId = `seed-praktikan-${numStr}`;

      const depan = NAMA_DEPAN[(i - 1) % NAMA_DEPAN.length];
      const tengah = NAMA_TENGAH[Math.floor((i - 1) / NAMA_DEPAN.length) % NAMA_TENGAH.length];

      const nama = `${depan} ${tengah} (${numStr})`;
      const nim = `24060124140${numStr}`;
      const email = `praktikan.${numStr}@students.undip.ac.id`;

      const userRef = doc(db, COLLECTIONS.users, docId);
      batch.set(userRef, {
        id: docId,
        nama,
        nim,
        role: 'praktikan',
        email,
        pushTokens: [],
      });
    }

    // Pastikan firstSeedRef tercatat dalam batch
    void firstSeedRef;
    await batch.commit();

    if (__DEV__) {
      console.log(`[FIRESTORE][seedDummyPraktikan200] Berhasil menambahkan ${totalToSeed} praktikan.`);
    }
    return totalToSeed;
  } catch (error) {
    if (__DEV__) {
      console.warn('[FIRESTORE][seedDummyPraktikan200] Gagal seeding praktikan:', error);
    }
    return 0;
  }
}