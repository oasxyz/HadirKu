/**
 * Daftar kelas praktikum sesuai jadwal resmi Informatika (A1–F2).
 * Dipakai di dropdown kelas (Daftar, Lengkapi Profil, Profil, Tambah Sesi) supaya
 * penulisan kelas seragam dan peserta sesi bisa dipilih otomatis per kelas.
 * Tambah atau hapus kelas cukup di sini.
 */
export const DAFTAR_KELAS = [
  'A1', 'A2',
  'B1', 'B2',
  'C1', 'C2',
  'D1', 'D2',
  'E1', 'E2',
  'F1', 'F2',
] as const;

export const OPSI_KELAS = DAFTAR_KELAS.map((kelas) => ({ label: `Kelas ${kelas}`, value: kelas }));

/** Sesi lama menyimpan kelas sebagai teks bebas ("Kelas A", "kelas a"); kenali yang sesuai daftar. */
export function kodeKelasDari(teks: string | undefined | null): string | null {
  const bersih = (teks ?? '').toUpperCase().replace(/^KELAS\s*/, '').trim();
  return (DAFTAR_KELAS as readonly string[]).includes(bersih) ? bersih : null;
}
