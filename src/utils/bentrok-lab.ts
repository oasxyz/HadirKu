// Satu lab tidak boleh dipakai dua sesi pada jam yang tumpang tindih.
// Sesi yang bersambung (selesai 10:00, berikutnya mulai 10:00) tidak dianggap bentrok.
import type { Session } from '@/types';

export type RencanaSesi = Pick<Session, 'labId' | 'tanggal' | 'jamMulai' | 'jamSelesai'>;

/** Sesi pertama (urut jam mulai) yang memakai lab yang sama di waktu yang tumpang tindih. */
export function cariBentrokLab(
  sessions: Session[],
  rencana: RencanaSesi,
  abaikanId?: string,
): Session | null {
  if (!rencana.labId) return null;
  // Format HH:mm bisa dibandingkan sebagai teks.
  return (
    sessions
      .filter(
        (s) =>
          s.id !== abaikanId &&
          s.labId === rencana.labId &&
          s.tanggal === rencana.tanggal &&
          s.jamMulai < rencana.jamSelesai &&
          rencana.jamMulai < s.jamSelesai,
      )
      .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai))[0] ?? null
  );
}
