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

import {
  DAFTAR_PRAKTIKUM,
  KELAS_KULIAH,
  type KelasKuliah,
  type KelasPraktikum,
} from '@/constants/praktikum';
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

// Seeding 4 laboratorium default jika koleksi labs masih kosong.
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

// 20 nama depan x 10 nama tengah = 200 kombinasi nama unik tanpa akhiran nomor / (uji)
const NAMA_DEPAN = [
  'Adi', 'Budi', 'Citra', 'Dewi', 'Eka', 'Fajar', 'Gita', 'Hadi', 'Indra', 'Joko',
  'Kartika', 'Lestari', 'Muhammad', 'Nabila', 'Oki', 'Putri', 'Rizky', 'Siti', 'Taufik', 'Wahyu',
] as const;

const NAMA_TENGAH = [
  'Pratama', 'Saputra', 'Wijaya', 'Kusuma', 'Hidayat',
  'Nugroho', 'Santoso', 'Permata', 'Rahmawati', 'Setiawan',
] as const;

/**
 * Membagi 40 mahasiswa dalam 1 kelas kuliah (pos 0..39) menjadi tepat 20 di <Kelas>1
 * dan 20 di <Kelas>2 per mata praktikum, sehingga mahasiswa bisa di D1 pada satu praktikum
 * dan D2 pada praktikum lain namun tetap dalam batas kelas kuliahnya.
 */
function buildKelasPraktikumMap(
  kelasKuliah: KelasKuliah,
  posInClass: number,
): Record<string, KelasPraktikum> {
  const map: Record<string, KelasPraktikum> = {};
  DAFTAR_PRAKTIKUM.forEach((praktikum, pIdx) => {
    const shifted = (posInClass + pIdx * 7) % 40;
    const sub = shifted < 20 ? '1' : '2';
    map[praktikum] = `${kelasKuliah}${sub}` as KelasPraktikum;
  });
  return map;
}

function bersihkanLabelUji(nama: string): string {
  return nama
    .replace(/\s*\(uji\)\s*/gi, ' ')
    .replace(/\s*\(\d{3}\)\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Seeder & migrasi 200 praktikan di koleksi `users`.
 * - Menghapus label `(uji)` dan nomor `(001)` dari data praktikan dummy lama.
 * - Mengisi `kelasKuliah` (A-E), `kelas` default (A1-E2), dan `kelasPraktikum` per praktikum.
 * - Aman & Idempotent: langsung return 0 bila seluruh data sudah bersih dan terisi.
 * Catatan: Panggil saat sudah login sebagai akun Asisten.
 */
export async function seedDummyPraktikan200IfNeeded(): Promise<number> {
  try {
    const usersCol = collection(db, COLLECTIONS.users);
    const existingSnap = await getDocs(usersCol);

    const existingSeedDocs = new Map<string, Record<string, unknown>>();
    const pendingWrites: Array<{ docId: string; payload: Record<string, unknown> }> = [];

    // 1. Bersihkan dokumen praktikan lama yang masih mengandung "(uji)" (mis. NIM 2406012499xxxx)
    let ujiIndex = 0;
    existingSnap.forEach((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      if (docSnap.id.startsWith('seed-praktikan-')) {
        existingSeedDocs.set(docSnap.id, data);
        return;
      }

      const rawNama = typeof data.nama === 'string' ? data.nama : '';
      if (data.role === 'praktikan' && /\(uji\)/i.test(rawNama)) {
        const kelasKuliah = (
          typeof data.kelasKuliah === 'string' &&
          KELAS_KULIAH.includes(data.kelasKuliah as KelasKuliah)
            ? data.kelasKuliah
            : KELAS_KULIAH[ujiIndex % KELAS_KULIAH.length]
        ) as KelasKuliah;
        const posInClass = ujiIndex % 40;
        const kelasPraktikum =
          (data.kelasPraktikum as Record<string, KelasPraktikum> | undefined) ??
          buildKelasPraktikumMap(kelasKuliah, posInClass);
        const defaultKelas =
          typeof data.kelas === 'string' && data.kelas.trim()
            ? data.kelas
            : `${kelasKuliah}${posInClass < 20 ? '1' : '2'}`;

        pendingWrites.push({
          docId: docSnap.id,
          payload: {
            nama: bersihkanLabelUji(rawNama),
            kelas: defaultKelas,
            kelasKuliah,
            kelasPraktikum,
          },
        });
        ujiIndex += 1;
      }
    });

    // 2. Pastikan 200 dokumen seed-praktikan-001..200 lengkap, bersih, dan punya peta kelas
    const totalToSeed = 200;
    for (let i = 1; i <= totalToSeed; i++) {
      const numStr = String(i).padStart(3, '0');
      const docId = `seed-praktikan-${numStr}`;

      const depan = NAMA_DEPAN[(i - 1) % NAMA_DEPAN.length];
      const tengah = NAMA_TENGAH[Math.floor((i - 1) / NAMA_DEPAN.length) % NAMA_TENGAH.length];
      const nama = `${depan} ${tengah}`;
      const nim = `24060124140${numStr}`;
      const email = `praktikan.${numStr}@students.undip.ac.id`;

      const kelasKuliah = KELAS_KULIAH[Math.floor((i - 1) / 40)];
      const posInClass = (i - 1) % 40;
      const defaultKelas = `${kelasKuliah}${posInClass < 20 ? '1' : '2'}` as KelasPraktikum;
      const kelasPraktikum = buildKelasPraktikumMap(kelasKuliah, posInClass);

      const existing = existingSeedDocs.get(docId);
      const existingMap = existing?.kelasPraktikum as Record<string, string> | undefined;
      const isUpToDate =
        existing !== undefined &&
        existing.nama === nama &&
        existing.kelas === defaultKelas &&
        existing.kelasKuliah === kelasKuliah &&
        existingMap !== undefined &&
        DAFTAR_PRAKTIKUM.every((p) => typeof existingMap[p] === 'string');

      if (!isUpToDate) {
        pendingWrites.push({
          docId,
          payload: {
            id: docId,
            nama,
            nim,
            role: 'praktikan',
            email,
            kelas: defaultKelas,
            kelasKuliah,
            kelasPraktikum,
            ...(existing ? {} : { pushTokens: [] }),
          },
        });
      }
    }

    if (pendingWrites.length === 0) {
      return 0;
    }

    // Commit per 400 dokumen (batas maksimum Firestore writeBatch adalah 500 operasi)
    const CHUNK_SIZE = 400;
    for (let start = 0; start < pendingWrites.length; start += CHUNK_SIZE) {
      const chunk = pendingWrites.slice(start, start + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(({ docId, payload }) => {
        batch.set(doc(db, COLLECTIONS.users, docId), payload, { merge: true });
      });
      await batch.commit();
    }

    if (__DEV__) {
      console.log(
        `[FIRESTORE][seedDummyPraktikan200] Berhasil menyinkronkan ${pendingWrites.length} praktikan (bersih tanpa label uji & kelas A1-E2).`,
      );
    }
    return pendingWrites.length;
  } catch (error) {
    if (__DEV__) {
      console.warn('[FIRESTORE][seedDummyPraktikan200] Gagal seeding praktikan:', error);
    }
    return 0;
  }
}