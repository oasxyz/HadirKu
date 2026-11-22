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
  'Platform Pengembangan Khusus',
] as const;

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
