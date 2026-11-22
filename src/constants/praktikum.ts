/**
 * Daftar mata praktikum Informatika untuk dropdown Nama Praktikum di Tambah Sesi.
 * Tambah atau ubah nama praktikum cukup di sini.
 */
export const DAFTAR_PRAKTIKUM = [
  'Dasar Pemrograman',
  'Dasar Sistem',
  'Algoritma dan Pemrograman',
  'Struktur Data',
  'Basis Data',
  'Sistem Operasi',
  'Pemrograman Berbasis Objek',
  'Manajemen Basis Data',
  'Jaringan Komputer',
  'Grafik dan Teknik Interaktif',
  'Analisis dan Strategi Algoritma',
  'Pembelajaran Mesin',
  'Pengembangan Platform Khusus',
] as const;

export type PraktikumNama = (typeof DAFTAR_PRAKTIKUM)[number];

export const KELAS_KULIAH = ['A', 'B', 'C', 'D', 'E'] as const;
export type KelasKuliah = (typeof KELAS_KULIAH)[number];

export const KELAS_PRAKTIKUM = [
  'A1', 'A2',
  'B1', 'B2',
  'C1', 'C2',
  'D1', 'D2',
  'E1', 'E2',
] as const;
export type KelasPraktikum = (typeof KELAS_PRAKTIKUM)[number];

/**
 * Mengembalikan 2 sub-kelas praktikum sesuai batas kelas kuliah, mis. 'D' -> ['D1', 'D2'].
 */
export function getSubKelasByKuliah(
  kelasKuliah: KelasKuliah,
): [KelasPraktikum, KelasPraktikum] {
  return [`${kelasKuliah}1` as KelasPraktikum, `${kelasKuliah}2` as KelasPraktikum];
}

/**
 * Opsi dropdown. Bila sesi lama memakai nama di luar daftar, nama itu ditambahkan
 * supaya tetap tampil saat sesi diubah.
 */
export function opsiPraktikum(namaSaatIni?: string) {
  const daftar: string[] = [...DAFTAR_PRAKTIKUM];
  const nama = namaSaatIni?.trim();
  if (nama && !daftar.includes(nama)) daftar.push(nama);
  return daftar.map((item) => ({ label: item, value: item }));
}